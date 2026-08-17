import AVFoundation
import ExpoModulesCore
import UIKit
import CoreVideo
import CoreImage

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
  var drawX: Double = 0

  @Field
  var drawY: Double = 0

  @Field
  var drawWidth: Double = 0

  @Field
  var drawHeight: Double = 0

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

private final class OverlayRenderState {
  let overlay: VideoOverlayRecord
  let output: AVAssetReaderTrackOutput
  let reader: AVAssetReader
  let duration: CMTime
  let drawRect: CGRect
  let clipRect: CGRect
  let cornerRadius: CGFloat
  let preferredTransform: CGAffineTransform

  private(set) var currentSample: CMSampleBuffer?
  private var nextSample: CMSampleBuffer?

  init(
    overlay: VideoOverlayRecord,
    output: AVAssetReaderTrackOutput,
    reader: AVAssetReader,
    duration: CMTime,
    drawRect: CGRect,
    clipRect: CGRect,
    cornerRadius: CGFloat,
    preferredTransform: CGAffineTransform
  ) {
    self.overlay = overlay
    self.output = output
    self.reader = reader
    self.duration = duration
    self.drawRect = drawRect
    self.clipRect = clipRect
    self.cornerRadius = cornerRadius
    self.preferredTransform = preferredTransform
  }

  func start() {
    reader.startReading()
    nextSample = output.copyNextSampleBuffer()
  }

  func advance(to time: CMTime) {
    while let sample = nextSample, CMSampleBufferGetPresentationTimeStamp(sample) <= time {
      currentSample = sample
      nextSample = output.copyNextSampleBuffer()
    }
  }
}

private struct LoadedFrameOverlay {
  let image: CGImage
  let rect: CGRect
}

enum VideoCompositorException: Error, LocalizedError {
  case invalidBackground
  case invalidOverlay
  case exportCreationFailed
  case exportFailed(String)

  var errorDescription: String? {
    switch self {
    case .invalidBackground:
      return "Failed to load the background snapshot."
    case .invalidOverlay:
      return "Failed to load the source video."
    case .exportCreationFailed:
      return "Failed to create the video export session."
    case .exportFailed(let reason):
      return "Video export failed: \(reason)"
    }
  }
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

    let renderSize = CGSize(width: backgroundCGImage.width, height: backgroundCGImage.height)
    var maxDuration = CMTime.zero
    let orderedOverlays = overlays.sorted {
      if $0.zIndex == $1.zIndex {
        return $0.order < $1.order
      }
      return $0.zIndex < $1.zIndex
    }

    var overlayStates: [OverlayRenderState] = []
    for overlay in orderedOverlays {
      let overlayURL = try resolveURL(from: overlay.uri)
      let asset = AVURLAsset(url: overlayURL)
      let duration = asset.duration
      guard let sourceVideoTrack = try await asset.loadTracks(withMediaType: .video).first else {
        throw VideoCompositorException.invalidOverlay
      }

      let reader = try AVAssetReader(asset: asset)
      let output = AVAssetReaderTrackOutput(
        track: sourceVideoTrack,
        outputSettings: [
          kCVPixelBufferPixelFormatTypeKey as String: Int(kCVPixelFormatType_32BGRA),
        ]
      )
      output.alwaysCopiesSampleData = false
      guard reader.canAdd(output) else {
        throw VideoCompositorException.invalidOverlay
      }
      reader.add(output)

      let clipRect = CGRect(
        x: overlay.x,
        y: overlay.y,
        width: overlay.width,
        height: overlay.height
      )
      let drawRect = CGRect(
        x: overlay.drawX,
        y: overlay.drawY,
        width: overlay.drawWidth,
        height: overlay.drawHeight
      )
      let preferredTransform = try await sourceVideoTrack.load(.preferredTransform)

      let state = OverlayRenderState(
        overlay: overlay,
        output: output,
        reader: reader,
        duration: duration,
        drawRect: drawRect,
        clipRect: clipRect,
        cornerRadius: CGFloat(overlay.cornerRadius),
        preferredTransform: preferredTransform
      )
      state.start()
      overlayStates.append(state)

      if duration > maxDuration {
        maxDuration = duration
      }
    }

    if maxDuration <= .zero {
      throw VideoCompositorException.invalidOverlay
    }

    let loadedFrameOverlays = try loadFrameOverlays(frameOverlays)

    let outputURL = makeOutputURL()
    try? FileManager.default.removeItem(at: outputURL)

    guard let writer = try? AVAssetWriter(outputURL: outputURL, fileType: .mp4) else {
      throw VideoCompositorException.exportCreationFailed
    }

    let videoSettings: [String: Any] = [
      AVVideoCodecKey: AVVideoCodecType.h264,
      AVVideoWidthKey: Int(renderSize.width),
      AVVideoHeightKey: Int(renderSize.height),
    ]
    let writerInput = AVAssetWriterInput(mediaType: .video, outputSettings: videoSettings)
    writerInput.expectsMediaDataInRealTime = false

    let adaptor = AVAssetWriterInputPixelBufferAdaptor(
      assetWriterInput: writerInput,
      sourcePixelBufferAttributes: [
        kCVPixelBufferPixelFormatTypeKey as String: Int(kCVPixelFormatType_32BGRA),
        kCVPixelBufferWidthKey as String: Int(renderSize.width),
        kCVPixelBufferHeightKey as String: Int(renderSize.height),
      ]
    )

    guard writer.canAdd(writerInput) else {
      throw VideoCompositorException.exportCreationFailed
    }
    writer.add(writerInput)

    guard writer.startWriting() else {
      throw VideoCompositorException.exportCreationFailed
    }
    writer.startSession(atSourceTime: .zero)

    let ciContext = CIContext(options: nil)
    let backgroundFrame = backgroundCGImage
    let fps: Int32 = 30
    let frameDuration = CMTime(value: 1, timescale: fps)
    let totalFrames = max(1, Int(ceil(CMTimeGetSeconds(maxDuration) * Double(fps))))

    for frameIndex in 0..<totalFrames {
      while !writerInput.isReadyForMoreMediaData {
        try await Task.sleep(nanoseconds: 5_000_000)
      }

      let presentationTime = CMTimeMultiply(frameDuration, multiplier: Int32(frameIndex))
      guard let pixelBufferPool = adaptor.pixelBufferPool else {
        throw VideoCompositorException.exportCreationFailed
      }
      guard let pixelBuffer = makeBlankPixelBuffer(from: pixelBufferPool) else {
        throw VideoCompositorException.exportCreationFailed
      }

      try renderFrame(
        into: pixelBuffer,
        size: renderSize,
        background: backgroundFrame,
        overlays: overlayStates,
        frameOverlays: loadedFrameOverlays,
        frameTime: presentationTime,
        ciContext: ciContext
      )

      if !adaptor.append(pixelBuffer, withPresentationTime: presentationTime) {
        throw VideoCompositorException.exportFailed("Failed to append video frame")
      }
    }

    writerInput.markAsFinished()

    return try await withCheckedThrowingContinuation { continuation in
      writer.finishWriting {
        if writer.status == .completed {
          continuation.resume(returning: outputURL.absoluteString)
        } else {
          continuation.resume(throwing: VideoCompositorException.exportFailed(writer.error?.localizedDescription ?? "Writer failed"))
        }
      }
    }
  }

  private func makeOutputURL() -> URL {
    let directory = appContext?.config.cacheDirectory ?? FileManager.default.temporaryDirectory
    return directory.appendingPathComponent("mockup_video_\(Date().timeIntervalSince1970).mp4")
  }

  private func loadFrameOverlays(_ overlays: [FrameOverlayRecord]) throws -> [LoadedFrameOverlay] {
    try overlays.compactMap { overlay in
      let overlayURL = try resolveURL(from: overlay.uri)
      let image: UIImage?
      if overlayURL.isFileURL {
        image = UIImage(contentsOfFile: overlayURL.path)
      } else if let data = try? Data(contentsOf: overlayURL) {
        image = UIImage(data: data)
      } else {
        image = nil
      }
      guard let cgImage = image?.cgImage else { return nil }
      return LoadedFrameOverlay(
        image: cgImage,
        rect: CGRect(
          x: overlay.x,
          y: overlay.y,
          width: overlay.width,
          height: overlay.height
        )
      )
    }
  }

  private func renderFrame(
    into pixelBuffer: CVPixelBuffer,
    size: CGSize,
    background: CGImage,
    overlays: [OverlayRenderState],
    frameOverlays: [LoadedFrameOverlay],
    frameTime: CMTime,
    ciContext: CIContext
  ) throws {
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
        bitmapInfo: CGBitmapInfo.byteOrder32Little.rawValue | CGImageAlphaInfo.premultipliedFirst.rawValue
      )
    else {
      throw VideoCompositorException.exportCreationFailed
    }

    context.clear(CGRect(origin: .zero, size: size))
    context.translateBy(x: 0, y: size.height)
    context.scaleBy(x: 1, y: -1)
    context.draw(background, in: CGRect(origin: .zero, size: size))

    for state in overlays {
      guard frameTime < state.duration else { continue }
      state.advance(to: frameTime)
      guard
        let sample = state.currentSample,
        let imageBuffer = CMSampleBufferGetImageBuffer(sample)
      else {
        continue
      }

      let ciImage = CIImage(cvPixelBuffer: imageBuffer)
      guard let cgImage = try makeOverlayFrameImage(from: ciImage, state: state, ciContext: ciContext) else {
        continue
      }

      context.saveGState()
      let radius = max(0, min(state.cornerRadius, min(state.clipRect.width, state.clipRect.height) / 2))
      let path = UIBezierPath(roundedRect: state.clipRect, cornerRadius: radius)
      context.addPath(path.cgPath)
      context.clip()
      context.draw(cgImage, in: state.drawRect)
      context.restoreGState()
    }

    for overlay in frameOverlays {
      context.draw(overlay.image, in: overlay.rect)
    }
  }

  private func makeOverlayFrameImage(
    from image: CIImage,
    state: OverlayRenderState,
    ciContext: CIContext
  ) throws -> CGImage? {
    let orientedRaw = image.transformed(by: state.preferredTransform)
    let oriented = orientedRaw.transformed(
      by: CGAffineTransform(
        translationX: -orientedRaw.extent.origin.x,
        y: -orientedRaw.extent.origin.y
      )
    )

    let cropRect = clampCropRect(
      CGRect(
        x: oriented.extent.width * state.overlay.cropXRatio,
        y: oriented.extent.height * state.overlay.cropYRatio,
        width: oriented.extent.width * max(min(state.overlay.cropWRatio, 1), 0.0001),
        height: oriented.extent.height * max(min(state.overlay.cropHRatio, 1), 0.0001)
      ),
      within: CGRect(origin: .zero, size: oriented.extent.size)
    )

    let cropped = oriented.cropped(to: cropRect)
      .transformed(by: CGAffineTransform(translationX: -cropRect.minX, y: -cropRect.minY))

    return ciContext.createCGImage(cropped, from: CGRect(origin: .zero, size: cropRect.size))
  }

  private func makeBlankPixelBuffer(from pool: CVPixelBufferPool) -> CVPixelBuffer? {
    var pixelBuffer: CVPixelBuffer?
    let status = CVPixelBufferPoolCreatePixelBuffer(kCFAllocatorDefault, pool, &pixelBuffer)
    guard status == kCVReturnSuccess else { return nil }
    return pixelBuffer
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
