import AVFoundation
import ExpoModulesCore
import UIKit
import CoreVideo

struct VideoOverlayRecord: Record {
  @Field
  var uri: String = ""

  @Field
  var x: Double = 0

  @Field
  var y: Double = 0

  @Field
  var width: Double = 0

  @Field
  var height: Double = 0

  @Field
  var cornerRadius: Double = 0

  @Field
  var zIndex: Double = 0

  @Field
  var order: Double = 0

  @Field
  var cropXRatio: Double = 0

  @Field
  var cropYRatio: Double = 0

  @Field
  var cropWRatio: Double = 1

  @Field
  var cropHRatio: Double = 1
}

struct FrameOverlayRecord: Record {
  @Field
  var uri: String = ""

  @Field
  var x: Double = 0

  @Field
  var y: Double = 0

  @Field
  var width: Double = 0

  @Field
  var height: Double = 0
}

enum VideoCompositorException: Error, LocalizedError {
  case invalidBackground
  case invalidOverlay
  case exportCreationFailed
  case backgroundVideoCreationFailed
  case exportFailed(String)

  var errorDescription: String? {
    switch self {
    case .invalidBackground:
      return "Failed to load the background snapshot."
    case .invalidOverlay:
      return "Failed to load the source video."
    case .exportCreationFailed:
      return "Failed to create the video export session."
    case .backgroundVideoCreationFailed:
      return "Failed to create the background video track."
    case .exportFailed(let reason):
      return "Video export failed: \(reason)"
    }
  }
}

private struct PreparedOverlay {
  let url: URL
  let origin: CGPoint
  let zIndex: Double
  let order: Double
  let duration: CMTime
}

public final class VideoCompositorModule: Module {
  public func definition() -> ModuleDefinition {
    Name("VideoCompositor")

    AsyncFunction("composeAsync") { (backgroundUri: String, overlays: [VideoOverlayRecord], frameOverlays: [FrameOverlayRecord]) async throws -> String in
      try await compose(backgroundUri: backgroundUri, overlays: overlays, frameOverlays: frameOverlays)
    }
  }

  private func compose(backgroundUri: String, overlays: [VideoOverlayRecord], frameOverlays: [FrameOverlayRecord]) async throws -> String {
    guard !overlays.isEmpty else {
      throw VideoCompositorException.invalidOverlay
    }

    let backgroundURL = try resolveURL(from: backgroundUri)

    guard
      let backgroundData = try? Data(contentsOf: backgroundURL),
      let backgroundImage = UIImage(data: backgroundData),
      let backgroundCGImage = backgroundImage.cgImage
    else {
      throw VideoCompositorException.invalidBackground
    }

    let sourceSize = CGSize(width: backgroundCGImage.width, height: backgroundCGImage.height)
    let normalized = normalizeRenderTarget(for: backgroundImage, sourceSize: sourceSize)
    let renderSize = normalized.size
    let overlayScaleX = renderSize.width / max(sourceSize.width, 1)
    let overlayScaleY = renderSize.height / max(sourceSize.height, 1)
    let composition = AVMutableComposition()
    var temporaryURLs: [URL] = []
    defer {
      cleanupTemporaryFiles(temporaryURLs)
    }

    var maxDuration = CMTime.zero
    var layerInstructions: [AVMutableVideoCompositionLayerInstruction] = []

    let orderedOverlays = overlays.sorted {
      if $0.zIndex == $1.zIndex {
        return $0.order < $1.order
      }
      return $0.zIndex > $1.zIndex
    }

    var preparedOverlays: [PreparedOverlay] = []

    for overlay in orderedOverlays {
      let targetRect = CGRect(
        x: overlay.x * overlayScaleX,
        y: overlay.y * overlayScaleY,
        width: overlay.width * overlayScaleX,
        height: overlay.height * overlayScaleY
      )
      let prepared = try await prepareOverlay(
        overlay,
        targetSize: CGSize(width: targetRect.width, height: targetRect.height),
        cornerRadius: CGFloat(overlay.cornerRadius * overlayScaleX)
      )
      temporaryURLs.append(prepared.url)
      preparedOverlays.append(
        PreparedOverlay(
          url: prepared.url,
          origin: CGPoint(x: targetRect.minX, y: targetRect.minY),
          zIndex: overlay.zIndex,
          order: overlay.order,
          duration: prepared.duration
        )
      )
      if prepared.duration > maxDuration {
        maxDuration = prepared.duration
      }
    }

    if maxDuration <= .zero {
      throw VideoCompositorException.invalidOverlay
    }

    let backgroundVideoURL = try await makeBackgroundVideo(
      from: normalized.image.cgImage ?? backgroundCGImage,
      size: renderSize,
      duration: maxDuration
    )
    temporaryURLs.append(backgroundVideoURL)
    let backgroundAsset = AVURLAsset(url: backgroundVideoURL)
    guard let backgroundSourceTrack = try await backgroundAsset.loadTracks(withMediaType: .video).first else {
      throw VideoCompositorException.backgroundVideoCreationFailed
    }

    let backgroundCompositionTrack = composition.addMutableTrack(withMediaType: .video, preferredTrackID: kCMPersistentTrackID_Invalid)
    try backgroundCompositionTrack?.insertTimeRange(CMTimeRange(start: .zero, duration: maxDuration), of: backgroundSourceTrack, at: .zero)
    var backgroundInstruction: AVMutableVideoCompositionLayerInstruction?
    if let backgroundCompositionTrack {
      let instruction = AVMutableVideoCompositionLayerInstruction(assetTrack: backgroundCompositionTrack)
      instruction.setTransform(.identity, at: .zero)
      backgroundInstruction = instruction
    }

    for prepared in preparedOverlays {
      let asset = AVURLAsset(url: prepared.url)
      guard let preparedVideoTrack = try await asset.loadTracks(withMediaType: .video).first else {
        throw VideoCompositorException.invalidOverlay
      }

      let compositionTrack = composition.addMutableTrack(withMediaType: .video, preferredTrackID: kCMPersistentTrackID_Invalid)
      try compositionTrack?.insertTimeRange(CMTimeRange(start: .zero, duration: prepared.duration), of: preparedVideoTrack, at: .zero)

      if let preparedAudioTrack = try await asset.loadTracks(withMediaType: .audio).first {
        let compositionAudioTrack = composition.addMutableTrack(withMediaType: .audio, preferredTrackID: kCMPersistentTrackID_Invalid)
        try compositionAudioTrack?.insertTimeRange(CMTimeRange(start: .zero, duration: prepared.duration), of: preparedAudioTrack, at: .zero)
      }

      if let compositionTrack {
        let instruction = AVMutableVideoCompositionLayerInstruction(assetTrack: compositionTrack)
        instruction.setTransform(
          CGAffineTransform(translationX: prepared.origin.x, y: prepared.origin.y),
          at: .zero
        )
        layerInstructions.append(instruction)
      }
    }

    if let backgroundInstruction {
      layerInstructions.append(backgroundInstruction)
    }

    let mainInstruction = AVMutableVideoCompositionInstruction()
    mainInstruction.timeRange = CMTimeRange(start: .zero, duration: maxDuration)
    mainInstruction.layerInstructions = layerInstructions

    let videoComposition = AVMutableVideoComposition()
    videoComposition.instructions = [mainInstruction]
    videoComposition.renderSize = renderSize
    videoComposition.frameDuration = CMTime(value: 1, timescale: 30)
    videoComposition.animationTool = makeFinalOverlayAnimationTool(
      renderSize: renderSize,
      overlays: frameOverlays
    )

    guard let exportSession = AVAssetExportSession(asset: composition, presetName: AVAssetExportPresetHighestQuality) else {
      throw VideoCompositorException.exportCreationFailed
    }

    let outputUrl = makeOutputURL()
    try? FileManager.default.removeItem(at: outputUrl)

    exportSession.videoComposition = videoComposition
    exportSession.outputURL = outputUrl
    exportSession.outputFileType = .mp4
    exportSession.shouldOptimizeForNetworkUse = true

    let result = try await withCheckedThrowingContinuation { continuation in
      exportSession.exportAsynchronously {
        switch exportSession.status {
        case .completed:
          continuation.resume(returning: outputUrl.absoluteString)
        case .failed:
          continuation.resume(throwing: VideoCompositorException.exportFailed(exportSession.error?.localizedDescription ?? "Unknown error"))
        case .cancelled:
          continuation.resume(throwing: VideoCompositorException.exportFailed("Cancelled"))
        default:
          continuation.resume(throwing: VideoCompositorException.exportFailed(exportSession.error?.localizedDescription ?? "Incomplete export"))
        }
      }
    }

    return result
  }

  private func makeOutputURL() -> URL {
    let directory = appContext?.config.cacheDirectory ?? FileManager.default.temporaryDirectory
    return directory.appendingPathComponent("mockup_video_\(Date().timeIntervalSince1970).mp4")
  }

  private func makeTemporaryURL(prefix: String) -> URL {
    let directory = appContext?.config.cacheDirectory ?? FileManager.default.temporaryDirectory
    return directory.appendingPathComponent("\(prefix)_\(Date().timeIntervalSince1970)_\(UUID().uuidString).mp4")
  }

  private func makeTemporaryOverlayURL() -> URL {
    let directory = appContext?.config.cacheDirectory ?? FileManager.default.temporaryDirectory
    return directory.appendingPathComponent("mockup_overlay_\(Date().timeIntervalSince1970)_\(UUID().uuidString).mov")
  }

  private func cleanupTemporaryFiles(_ urls: [URL]) {
    for url in urls {
      try? FileManager.default.removeItem(at: url)
    }
  }

  private func normalizeRenderTarget(for image: UIImage, sourceSize: CGSize) -> (size: CGSize, image: UIImage) {
    let maxEdge: CGFloat = 1920
    let longestEdge = max(sourceSize.width, sourceSize.height)
    let rawScale = longestEdge > maxEdge ? (maxEdge / longestEdge) : 1
    let scaledWidth = makeEven(max(2, Int(round(sourceSize.width * rawScale))))
    let scaledHeight = makeEven(max(2, Int(round(sourceSize.height * rawScale))))
    let targetSize = CGSize(width: scaledWidth, height: scaledHeight)

    let renderer = UIGraphicsImageRenderer(size: targetSize)
    let scaledImage = renderer.image { _ in
      UIColor.clear.setFill()
      UIRectFill(CGRect(origin: .zero, size: targetSize))
      image.draw(in: CGRect(origin: .zero, size: targetSize))
    }

    return (targetSize, scaledImage)
  }

  private func makeEven(_ value: Int) -> CGFloat {
    let evenValue = value % 2 == 0 ? value : value - 1
    return CGFloat(max(evenValue, 2))
  }

  private func resolveURL(from rawValue: String) throws -> URL {
    if let url = URL(string: rawValue), url.scheme != nil {
      return url
    }

    if rawValue.isEmpty {
      throw VideoCompositorException.invalidOverlay
    }

    return URL(fileURLWithPath: rawValue)
  }

  private func makeBackgroundVideo(from image: CGImage, size: CGSize, duration: CMTime) async throws -> URL {
    let outputURL = makeOutputURL().deletingLastPathComponent().appendingPathComponent("mockup_bg_\(Date().timeIntervalSince1970).mp4")
    try? FileManager.default.removeItem(at: outputURL)

    guard let writer = try? AVAssetWriter(outputURL: outputURL, fileType: .mp4) else {
      throw VideoCompositorException.backgroundVideoCreationFailed
    }

    let settings: [String: Any] = [
      AVVideoCodecKey: AVVideoCodecType.h264,
      AVVideoWidthKey: Int(size.width),
      AVVideoHeightKey: Int(size.height),
    ]

    let writerInput = AVAssetWriterInput(mediaType: .video, outputSettings: settings)
    writerInput.expectsMediaDataInRealTime = false

    let adaptor = AVAssetWriterInputPixelBufferAdaptor(
      assetWriterInput: writerInput,
      sourcePixelBufferAttributes: [
        kCVPixelBufferPixelFormatTypeKey as String: Int(kCVPixelFormatType_32ARGB),
        kCVPixelBufferWidthKey as String: Int(size.width),
        kCVPixelBufferHeightKey as String: Int(size.height),
      ]
    )

    guard writer.canAdd(writerInput) else {
      throw VideoCompositorException.backgroundVideoCreationFailed
    }
    writer.add(writerInput)

    guard writer.startWriting() else {
      throw VideoCompositorException.backgroundVideoCreationFailed
    }
    writer.startSession(atSourceTime: .zero)

    guard let pixelBuffer = makePixelBuffer(from: image, size: size) else {
      throw VideoCompositorException.backgroundVideoCreationFailed
    }

    let fps: Int32 = 30
    let frameDuration = CMTime(value: 1, timescale: fps)
    let totalFrames = max(1, Int(ceil(CMTimeGetSeconds(duration) * Double(fps))))

    for frameIndex in 0..<totalFrames {
      while !writerInput.isReadyForMoreMediaData {
        try await Task.sleep(nanoseconds: 5_000_000)
      }

      let presentationTime = CMTimeMultiply(frameDuration, multiplier: Int32(frameIndex))
      if !adaptor.append(pixelBuffer, withPresentationTime: presentationTime) {
        throw VideoCompositorException.backgroundVideoCreationFailed
      }
    }

    writerInput.markAsFinished()

    return try await withCheckedThrowingContinuation { continuation in
      writer.finishWriting {
        if writer.status == .completed {
          continuation.resume(returning: outputURL)
        } else {
          continuation.resume(throwing: VideoCompositorException.backgroundVideoCreationFailed)
        }
      }
    }
  }

  private func makePixelBuffer(from image: CGImage, size: CGSize) -> CVPixelBuffer? {
    let attrs: [String: Any] = [
      kCVPixelBufferCGImageCompatibilityKey as String: true,
      kCVPixelBufferCGBitmapContextCompatibilityKey as String: true,
    ]
    var pixelBuffer: CVPixelBuffer?
    let status = CVPixelBufferCreate(
      kCFAllocatorDefault,
      Int(size.width),
      Int(size.height),
      kCVPixelFormatType_32ARGB,
      attrs as CFDictionary,
      &pixelBuffer
    )

    guard status == kCVReturnSuccess, let pixelBuffer else {
      return nil
    }

    CVPixelBufferLockBaseAddress(pixelBuffer, [])
    defer { CVPixelBufferUnlockBaseAddress(pixelBuffer, []) }

    guard
      let context = CGContext(
        data: CVPixelBufferGetBaseAddress(pixelBuffer),
        width: Int(size.width),
        height: Int(size.height),
        bitsPerComponent: 8,
        bytesPerRow: CVPixelBufferGetBytesPerRow(pixelBuffer),
        space: CGColorSpaceCreateDeviceRGB(),
        bitmapInfo: CGImageAlphaInfo.noneSkipFirst.rawValue
      )
    else {
      return nil
    }

    context.clear(CGRect(origin: .zero, size: size))
    context.draw(image, in: CGRect(origin: .zero, size: size))
    return pixelBuffer
  }

  private func prepareOverlay(
    _ overlay: VideoOverlayRecord,
    targetSize: CGSize,
    cornerRadius: CGFloat
  ) async throws -> (url: URL, duration: CMTime) {
    let sourceURL = try resolveURL(from: overlay.uri)
    let asset = AVURLAsset(url: sourceURL)
    let duration = asset.duration

    guard let sourceVideoTrack = try await asset.loadTracks(withMediaType: .video).first else {
      throw VideoCompositorException.invalidOverlay
    }

    let composition = AVMutableComposition()
    let compositionTrack = composition.addMutableTrack(withMediaType: .video, preferredTrackID: kCMPersistentTrackID_Invalid)
    try compositionTrack?.insertTimeRange(CMTimeRange(start: .zero, duration: duration), of: sourceVideoTrack, at: .zero)

    if let sourceAudioTrack = try await asset.loadTracks(withMediaType: .audio).first {
      let compositionAudioTrack = composition.addMutableTrack(withMediaType: .audio, preferredTrackID: kCMPersistentTrackID_Invalid)
      try compositionAudioTrack?.insertTimeRange(CMTimeRange(start: .zero, duration: duration), of: sourceAudioTrack, at: .zero)
    }

    guard let compositionTrack else {
      throw VideoCompositorException.invalidOverlay
    }

    let transform = try await makeCropToOutputTransform(
      for: sourceVideoTrack,
      outputSize: targetSize,
      cropXRatio: overlay.cropXRatio,
      cropYRatio: overlay.cropYRatio,
      cropWRatio: overlay.cropWRatio,
      cropHRatio: overlay.cropHRatio
    )

    let instruction = AVMutableVideoCompositionLayerInstruction(assetTrack: compositionTrack)
    instruction.setTransform(transform, at: .zero)

    let mainInstruction = AVMutableVideoCompositionInstruction()
    mainInstruction.timeRange = CMTimeRange(start: .zero, duration: duration)
    mainInstruction.layerInstructions = [instruction]

    let videoComposition = AVMutableVideoComposition()
    videoComposition.instructions = [mainInstruction]
    videoComposition.renderSize = CGSize(width: max(targetSize.width, 2), height: max(targetSize.height, 2))
    videoComposition.frameDuration = CMTime(value: 1, timescale: 30)
    videoComposition.animationTool = makeMaskAnimationTool(
      renderSize: videoComposition.renderSize,
      cornerRadius: min(cornerRadius, min(videoComposition.renderSize.width, videoComposition.renderSize.height) / 2)
    )

    let exportPreset = AVAssetExportPresetHEVCHighestQualityWithAlpha
    guard let exportSession = AVAssetExportSession(asset: composition, presetName: exportPreset) else {
      throw VideoCompositorException.exportCreationFailed
    }

    let outputURL = makeTemporaryOverlayURL()
    try? FileManager.default.removeItem(at: outputURL)

    exportSession.videoComposition = videoComposition
    exportSession.outputURL = outputURL
    exportSession.outputFileType = .mov
    exportSession.shouldOptimizeForNetworkUse = true

    _ = try await withCheckedThrowingContinuation { continuation in
      exportSession.exportAsynchronously {
        switch exportSession.status {
        case .completed:
          continuation.resume(returning: outputURL.absoluteString)
        case .failed:
          continuation.resume(throwing: VideoCompositorException.exportFailed(exportSession.error?.localizedDescription ?? "Unknown error"))
        case .cancelled:
          continuation.resume(throwing: VideoCompositorException.exportFailed("Cancelled"))
        default:
          continuation.resume(throwing: VideoCompositorException.exportFailed(exportSession.error?.localizedDescription ?? "Incomplete export"))
        }
      }
    }

    return (outputURL, duration)
  }

  private func makeMaskAnimationTool(
    renderSize: CGSize,
    cornerRadius: CGFloat
  ) -> AVVideoCompositionCoreAnimationTool {
    let parentLayer = CALayer()
    parentLayer.frame = CGRect(origin: .zero, size: renderSize)

    let videoLayer = CALayer()
    videoLayer.frame = CGRect(origin: .zero, size: renderSize)
    if cornerRadius > 0 {
      let maskLayer = CAShapeLayer()
      maskLayer.frame = videoLayer.bounds
      maskLayer.path = UIBezierPath(
        roundedRect: videoLayer.bounds,
        cornerRadius: max(cornerRadius, 0)
      ).cgPath
      videoLayer.mask = maskLayer
    }

    parentLayer.addSublayer(videoLayer)

    return AVVideoCompositionCoreAnimationTool(
      postProcessingAsVideoLayer: videoLayer,
      in: parentLayer
    )
  }

  private func makeFinalOverlayAnimationTool(
    renderSize: CGSize,
    overlays: [FrameOverlayRecord]
  ) -> AVVideoCompositionCoreAnimationTool {
    let parentLayer = CALayer()
    parentLayer.frame = CGRect(origin: .zero, size: renderSize)

    let videoLayer = CALayer()
    videoLayer.frame = CGRect(origin: .zero, size: renderSize)
    parentLayer.addSublayer(videoLayer)

    for overlay in overlays {
      guard let overlayURL = try? resolveURL(from: overlay.uri) else { continue }
      let image: UIImage?
      if overlayURL.isFileURL {
        image = UIImage(contentsOfFile: overlayURL.path)
      } else if let data = try? Data(contentsOf: overlayURL) {
        image = UIImage(data: data)
      } else {
        image = nil
      }
      guard let image else { continue }
      let layer = CALayer()
      layer.frame = CGRect(
        x: overlay.x,
        y: overlay.y,
        width: overlay.width,
        height: overlay.height
      )
      layer.contents = image.cgImage
      layer.contentsGravity = .resize
      parentLayer.addSublayer(layer)
    }

    return AVVideoCompositionCoreAnimationTool(
      postProcessingAsVideoLayer: videoLayer,
      in: parentLayer
    )
  }

  private func makeCropToOutputTransform(
    for track: AVAssetTrack,
    outputSize: CGSize,
    cropXRatio: Double,
    cropYRatio: Double,
    cropWRatio: Double,
    cropHRatio: Double
  ) async throws -> CGAffineTransform {
    let preferredTransform = try await track.load(.preferredTransform)
    let naturalSize = try await track.load(.naturalSize)
    let transformedRect = CGRect(origin: .zero, size: naturalSize).applying(preferredTransform)
    let normalizedRect = CGRect(
      x: 0,
      y: 0,
      width: abs(transformedRect.width),
      height: abs(transformedRect.height)
    )

    let moveToOrigin = CGAffineTransform(translationX: -transformedRect.origin.x, y: -transformedRect.origin.y)
    let cropRect = clampCropRect(
      CGRect(
      x: normalizedRect.width * cropXRatio,
      y: normalizedRect.height * cropYRatio,
      width: normalizedRect.width * max(min(cropWRatio, 1), 0.0001),
      height: normalizedRect.height * max(min(cropHRatio, 1), 0.0001)
      ),
      within: normalizedRect
    )
    let cropOriginTransform = CGAffineTransform(
      translationX: -cropRect.minX,
      y: -cropRect.minY
    )
    let safeOutputSize = CGSize(width: max(outputSize.width, 1), height: max(outputSize.height, 1))
    let scaleX = safeOutputSize.width / max(cropRect.width, 1)
    let scaleY = safeOutputSize.height / max(cropRect.height, 1)
    let scaleTransform = CGAffineTransform(scaleX: scaleX, y: scaleY)

    return preferredTransform
      .concatenating(moveToOrigin)
      .concatenating(cropOriginTransform)
      .concatenating(scaleTransform)
  }

  private func clampCropRect(_ cropRect: CGRect, within bounds: CGRect) -> CGRect {
    let width = min(max(cropRect.width, 1), bounds.width)
    let height = min(max(cropRect.height, 1), bounds.height)
    let minX = bounds.minX
    let minY = bounds.minY
    let maxX = max(bounds.maxX - width, bounds.minX)
    let maxY = max(bounds.maxY - height, bounds.minY)

    return CGRect(
      x: min(max(cropRect.minX, minX), maxX),
      y: min(max(cropRect.minY, minY), maxY),
      width: width,
      height: height
    )
  }
}
