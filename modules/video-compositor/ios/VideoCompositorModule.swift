import ExpoModulesCore
import AVFoundation
import UIKit

// MARK: - Expo Module

public class VideoCompositorModule: Module {
  public func definition() -> ModuleDefinition {
    Name("VideoCompositor")

    /// Composites a video file into a device frame background image using AVFoundation.
    ///
    /// Parameters (passed as a JS object):
    ///  - backgroundImagePath: file:// URI or bare path to the Skia canvas PNG
    ///  - videoPath:           file:// URI or bare path to the source video
    ///  - screenRectX/Y/Width/Height: pixel coordinates of the device screen area
    ///    within the background image (UIKit coordinate system, top-left origin)
    ///  - outputPath:          bare path for the output .mp4 file
    ///
    /// Returns: "file://" + outputPath on success
    AsyncFunction("composeVideo") { (params: [String: Any], promise: Promise) in
      guard
        let bgPath   = params["backgroundImagePath"] as? String,
        let vidPath  = params["videoPath"]           as? String,
        let x        = (params["screenRectX"]        as? NSNumber)?.doubleValue,
        let y        = (params["screenRectY"]        as? NSNumber)?.doubleValue,
        let w        = (params["screenRectWidth"]     as? NSNumber)?.doubleValue,
        let h        = (params["screenRectHeight"]    as? NSNumber)?.doubleValue,
        let outPath  = params["outputPath"]           as? String
      else {
        promise.reject("INVALID_ARGS", "Missing required parameters")
        return
      }

      let screenRect = CGRect(x: x, y: y, width: w, height: h)

      Task {
        do {
          let uri = try await VideoCompositor.compose(
            bgPath: bgPath,
            videoPath: vidPath,
            screenRect: screenRect,
            outputPath: outPath
          )
          promise.resolve(uri)
        } catch {
          promise.reject("COMPOSE_FAILED", error.localizedDescription)
        }
      }
    }
  }
}

// MARK: - Errors

private enum CompositorError: LocalizedError {
  case bgImageNotFound(String)
  case noVideoTrack
  case exportSessionCreationFailed
  case exportFailed(String)

  var errorDescription: String? {
    switch self {
    case .bgImageNotFound(let p): return "Background image not found: \(p)"
    case .noVideoTrack:           return "Source video has no video track"
    case .exportSessionCreationFailed: return "Failed to create AVAssetExportSession"
    case .exportFailed(let msg):  return "Export failed: \(msg)"
    }
  }
}

// MARK: - Compositor

private class VideoCompositor {

  /// Main composition entry point.
  static func compose(
    bgPath: String,
    videoPath: String,
    screenRect: CGRect,   // pixels, UIKit coords (top-left origin), relative to bgImage
    outputPath: String
  ) async throws -> String {
    let bgFile  = stripScheme(bgPath)
    let vidFile = stripScheme(videoPath)
    let outFile = stripScheme(outputPath)

    // --- Load background image ---
    guard
      let bgImage   = UIImage(contentsOfFile: bgFile),
      let bgCGImage = bgImage.cgImage
    else {
      throw CompositorError.bgImageNotFound(bgFile)
    }

    // Background pixel dimensions (= output video size)
    let outputSize = CGSize(
      width:  CGFloat(bgCGImage.width),
      height: CGFloat(bgCGImage.height)
    )

    // --- Load video asset ---
    let videoURL = URL(fileURLWithPath: vidFile)
    let asset    = AVURLAsset(url: videoURL)

    let videoTracks = try await asset.loadTracks(withMediaType: .video)
    guard let videoTrack = videoTracks.first else {
      throw CompositorError.noVideoTrack
    }

    let duration         = try await asset.load(.duration)
    let naturalSize      = try await videoTrack.load(.naturalSize)
    let preferredTx      = try await videoTrack.load(.preferredTransform)

    // --- Build AVMutableComposition ---
    let composition = AVMutableComposition()

    let compVideo = composition.addMutableTrack(
      withMediaType: .video,
      preferredTrackID: kCMPersistentTrackID_Invalid
    )!
    try compVideo.insertTimeRange(
      CMTimeRange(start: .zero, duration: duration),
      of: videoTrack, at: .zero
    )

    // Include audio if present
    let audioTracks = try await asset.loadTracks(withMediaType: .audio)
    if let audioTrack = audioTracks.first {
      let compAudio = composition.addMutableTrack(
        withMediaType: .audio,
        preferredTrackID: kCMPersistentTrackID_Invalid
      )
      try compAudio?.insertTimeRange(
        CMTimeRange(start: .zero, duration: duration),
        of: audioTrack, at: .zero
      )
    }

    // --- Layer tree ---
    //
    // parentLayer (outputSize, geometry flipped → Y increases downward like UIKit)
    //   ├── bgLayer   (full frame, device frame PNG)
    //   └── videoLayer (at screenRect — where video content appears)
    //
    // isGeometryFlipped = true lets us use UIKit/top-left coordinates for frame rects.

    let parentLayer = CALayer()
    parentLayer.frame = CGRect(origin: .zero, size: outputSize)
    parentLayer.isGeometryFlipped = true

    let bgLayer = CALayer()
    bgLayer.contents       = bgCGImage
    bgLayer.frame          = parentLayer.frame
    bgLayer.contentsGravity = .resize
    parentLayer.addSublayer(bgLayer)

    let videoLayer = CALayer()
    videoLayer.frame = screenRect          // UIKit coords — works with isGeometryFlipped
    parentLayer.addSublayer(videoLayer)

    // --- Video composition ---
    let videoComposition = AVMutableVideoComposition()
    videoComposition.renderSize    = outputSize
    videoComposition.frameDuration = CMTime(value: 1, timescale: 30)
    videoComposition.animationTool = AVVideoCompositionCoreAnimationTool(
      postProcessingAsVideoLayer: videoLayer,
      in: parentLayer
    )

    // Layer instruction:
    //  1. orientationTransform — rotates the video to upright, origin at (0,0)
    //  2. scale                — scales to fill videoLayer.bounds (screenRect.size)
    //  Translation to screenRect.origin is handled by videoLayer.frame above.
    let instruction = AVMutableVideoCompositionInstruction()
    instruction.timeRange = CMTimeRange(start: .zero, duration: duration)

    let layerInstruction = AVMutableVideoCompositionLayerInstruction(assetTrack: compVideo)
    let (orientedTx, displaySize) = orientationTransform(
      naturalSize: naturalSize,
      preferredTransform: preferredTx
    )
    let scaleX = screenRect.width  / displaySize.width
    let scaleY = screenRect.height / displaySize.height
    let finalTx = orientedTx.concatenating(CGAffineTransform(scaleX: scaleX, y: scaleY))
    layerInstruction.setTransform(finalTx, at: .zero)

    instruction.layerInstructions = [layerInstruction]
    videoComposition.instructions = [instruction]

    // --- Export ---
    let outURL = URL(fileURLWithPath: outFile)
    try? FileManager.default.removeItem(at: outURL)

    guard let exporter = AVAssetExportSession(
      asset: composition,
      presetName: AVAssetExportPresetHighestQuality
    ) else {
      throw CompositorError.exportSessionCreationFailed
    }

    exporter.outputURL       = outURL
    exporter.outputFileType  = .mp4
    exporter.videoComposition = videoComposition

    await exporter.export()

    guard exporter.status == .completed else {
      let msg = exporter.error?.localizedDescription ?? "unknown"
      throw CompositorError.exportFailed(msg)
    }

    return "file://" + outFile
  }

  // MARK: - Helpers

  /// Computes a CGAffineTransform that corrects video orientation so the video
  /// is upright with its top-left corner at (0, 0), and returns the display size.
  ///
  /// This works by zeroing the translation from preferredTransform, finding the
  /// bounding box of the rotated corners, then shifting to the origin.
  private static func orientationTransform(
    naturalSize: CGSize,
    preferredTransform: CGAffineTransform
  ) -> (CGAffineTransform, CGSize) {
    var t    = preferredTransform
    t.tx     = 0
    t.ty     = 0

    // Transform all four corners of the video rectangle
    let corners: [CGPoint] = [
      CGPoint(x: 0,                 y: 0),
      CGPoint(x: naturalSize.width, y: 0),
      CGPoint(x: 0,                 y: naturalSize.height),
      CGPoint(x: naturalSize.width, y: naturalSize.height),
    ].map { $0.applying(t) }

    let minX = corners.map(\.x).min()!
    let minY = corners.map(\.y).min()!
    let maxX = corners.map(\.x).max()!
    let maxY = corners.map(\.y).max()!

    // Shift so the bounding box starts at (0, 0)
    t.tx = -minX
    t.ty = -minY

    let displaySize = CGSize(width: maxX - minX, height: maxY - minY)
    return (t, displaySize)
  }

  private static func stripScheme(_ path: String) -> String {
    path.hasPrefix("file://") ? String(path.dropFirst(7)) : path
  }
}
