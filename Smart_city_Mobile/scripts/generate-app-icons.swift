import AppKit
import CoreImage
import Foundation

struct IconTarget {
  let path: String
  let size: Int
}

enum IconError: Error, CustomStringConvertible {
  case usage
  case cannotLoadSource(String)
  case cannotCreateBitmap(Int)
  case cannotRenderPNG(String)

  var description: String {
    switch self {
    case .usage:
      return "Usage: swift scripts/generate-app-icons.swift <source-image> <project-root>"
    case .cannotLoadSource(let path):
      return "Cannot load source image: \(path)"
    case .cannotCreateBitmap(let size):
      return "Cannot create bitmap for size \(size)"
    case .cannotRenderPNG(let path):
      return "Cannot render PNG: \(path)"
    }
  }
}

func ensureDirectory(_ url: URL) throws {
  try FileManager.default.createDirectory(
    at: url,
    withIntermediateDirectories: true
  )
}

func pngData(from image: NSImage) throws -> Data {
  guard let tiff = image.tiffRepresentation,
        let bitmap = NSBitmapImageRep(data: tiff),
        let data = bitmap.representation(using: .png, properties: [:]) else {
    throw IconError.cannotRenderPNG("image")
  }

  return data
}

func imageFromPNGData(_ data: Data, size: Int) throws -> NSImage {
  guard let image = NSImage(data: data) else {
    throw IconError.cannotRenderPNG("filtered image")
  }

  image.size = NSSize(width: size, height: size)
  return image
}

func filteredPNGData(from image: NSImage, size: Int) throws -> Data {
  let data = try pngData(from: image)
  guard var ciImage = CIImage(data: data) else {
    return data
  }

  let controls = CIFilter(name: "CIColorControls")
  controls?.setValue(ciImage, forKey: kCIInputImageKey)
  controls?.setValue(1.08, forKey: kCIInputContrastKey)
  controls?.setValue(1.03, forKey: kCIInputSaturationKey)
  controls?.setValue(0.01, forKey: kCIInputBrightnessKey)
  ciImage = controls?.outputImage ?? ciImage

  let unsharp = CIFilter(name: "CIUnsharpMask")
  unsharp?.setValue(ciImage, forKey: kCIInputImageKey)
  unsharp?.setValue(1.4, forKey: kCIInputRadiusKey)
  unsharp?.setValue(0.55, forKey: kCIInputIntensityKey)
  ciImage = unsharp?.outputImage ?? ciImage

  let context = CIContext(options: [.workingColorSpace: NSNull()])
  let extent = CGRect(x: 0, y: 0, width: size, height: size)
  guard let cgImage = context.createCGImage(ciImage, from: extent) else {
    return data
  }

  let rep = NSBitmapImageRep(cgImage: cgImage)
  guard let filteredData = rep.representation(using: .png, properties: [:]) else {
    return data
  }

  return filteredData
}

func renderIcon(
  source: NSImage,
  sourceSize: NSSize,
  cropTopLeft: CGRect,
  size: Int
) throws -> NSImage {
  guard let rep = NSBitmapImageRep(
    bitmapDataPlanes: nil,
    pixelsWide: size,
    pixelsHigh: size,
    bitsPerSample: 8,
    samplesPerPixel: 4,
    hasAlpha: true,
    isPlanar: false,
    colorSpaceName: .deviceRGB,
    bytesPerRow: 0,
    bitsPerPixel: 0
  ) else {
    throw IconError.cannotCreateBitmap(size)
  }

  let graphicsContext = NSGraphicsContext(bitmapImageRep: rep)
  NSGraphicsContext.saveGraphicsState()
  NSGraphicsContext.current = graphicsContext
  graphicsContext?.imageInterpolation = .high
  graphicsContext?.shouldAntialias = true

  let targetRect = NSRect(x: 0, y: 0, width: size, height: size)
  NSColor.black.setFill()
  targetRect.fill()

  let cropRect = NSRect(
    x: cropTopLeft.origin.x,
    y: sourceSize.height - cropTopLeft.origin.y - cropTopLeft.height,
    width: cropTopLeft.width,
    height: cropTopLeft.height
  )

  source.draw(
    in: targetRect,
    from: cropRect,
    operation: .sourceOver,
    fraction: 1.0,
    respectFlipped: false,
    hints: [.interpolation: NSImageInterpolation.high]
  )

  NSGraphicsContext.restoreGraphicsState()

  let image = NSImage(size: NSSize(width: size, height: size))
  image.addRepresentation(rep)
  return image
}

func write(_ image: NSImage, to url: URL) throws {
  try ensureDirectory(url.deletingLastPathComponent())
  let data = try pngData(from: image)
  try data.write(to: url, options: .atomic)
}

func run() throws {
  guard CommandLine.arguments.count >= 3 else {
    throw IconError.usage
  }

  let sourcePath = CommandLine.arguments[1]
  let projectRoot = URL(fileURLWithPath: CommandLine.arguments[2], isDirectory: true)
  let sourceURL = URL(fileURLWithPath: sourcePath)

  guard let source = NSImage(contentsOf: sourceURL),
        let sourceRep = source.representations.first else {
    throw IconError.cannotLoadSource(sourcePath)
  }

  let sourceSize = NSSize(
    width: sourceRep.pixelsWide,
    height: sourceRep.pixelsHigh
  )
  source.size = sourceSize

  let cropSize = min(sourceSize.width, sourceSize.height) * 0.83
  let cropTopLeft = CGRect(
    x: (sourceSize.width - cropSize) / 2.0 - 8.0,
    y: sourceSize.height * 0.075,
    width: cropSize,
    height: cropSize
  )
  let masterSize = 1024
  let rawMaster = try renderIcon(
    source: source,
    sourceSize: sourceSize,
    cropTopLeft: cropTopLeft,
    size: masterSize
  )
  let filteredMasterData = try filteredPNGData(from: rawMaster, size: masterSize)
  let masterImage = try imageFromPNGData(filteredMasterData, size: masterSize)
  let masterURL = projectRoot.appendingPathComponent("src/assets/app-icon-master.png")
  try ensureDirectory(masterURL.deletingLastPathComponent())
  try filteredMasterData.write(to: masterURL, options: .atomic)

  let androidTargets: [IconTarget] = [
    IconTarget(path: "android/app/src/main/res/mipmap-mdpi/ic_launcher.png", size: 48),
    IconTarget(path: "android/app/src/main/res/mipmap-mdpi/ic_launcher_round.png", size: 48),
    IconTarget(path: "android/app/src/main/res/mipmap-hdpi/ic_launcher.png", size: 72),
    IconTarget(path: "android/app/src/main/res/mipmap-hdpi/ic_launcher_round.png", size: 72),
    IconTarget(path: "android/app/src/main/res/mipmap-xhdpi/ic_launcher.png", size: 96),
    IconTarget(path: "android/app/src/main/res/mipmap-xhdpi/ic_launcher_round.png", size: 96),
    IconTarget(path: "android/app/src/main/res/mipmap-xxhdpi/ic_launcher.png", size: 144),
    IconTarget(path: "android/app/src/main/res/mipmap-xxhdpi/ic_launcher_round.png", size: 144),
    IconTarget(path: "android/app/src/main/res/mipmap-xxxhdpi/ic_launcher.png", size: 192),
    IconTarget(path: "android/app/src/main/res/mipmap-xxxhdpi/ic_launcher_round.png", size: 192),
  ]

  let iosTargets: [IconTarget] = [
    IconTarget(path: "ios/SmartCityMobile/Images.xcassets/AppIcon.appiconset/Icon-App-20x20@2x.png", size: 40),
    IconTarget(path: "ios/SmartCityMobile/Images.xcassets/AppIcon.appiconset/Icon-App-20x20@3x.png", size: 60),
    IconTarget(path: "ios/SmartCityMobile/Images.xcassets/AppIcon.appiconset/Icon-App-29x29@2x.png", size: 58),
    IconTarget(path: "ios/SmartCityMobile/Images.xcassets/AppIcon.appiconset/Icon-App-29x29@3x.png", size: 87),
    IconTarget(path: "ios/SmartCityMobile/Images.xcassets/AppIcon.appiconset/Icon-App-40x40@2x.png", size: 80),
    IconTarget(path: "ios/SmartCityMobile/Images.xcassets/AppIcon.appiconset/Icon-App-40x40@3x.png", size: 120),
    IconTarget(path: "ios/SmartCityMobile/Images.xcassets/AppIcon.appiconset/Icon-App-60x60@2x.png", size: 120),
    IconTarget(path: "ios/SmartCityMobile/Images.xcassets/AppIcon.appiconset/Icon-App-60x60@3x.png", size: 180),
    IconTarget(path: "ios/SmartCityMobile/Images.xcassets/AppIcon.appiconset/Icon-App-1024x1024@1x.png", size: 1024),
  ]

  for target in androidTargets + iosTargets {
    let image = try renderIcon(
      source: masterImage,
      sourceSize: NSSize(width: masterSize, height: masterSize),
      cropTopLeft: CGRect(x: 0, y: 0, width: masterSize, height: masterSize),
      size: target.size
    )
    try write(image, to: projectRoot.appendingPathComponent(target.path))
  }

  print("Generated app icon master and \(androidTargets.count + iosTargets.count) launcher icons.")
}

do {
  try run()
} catch {
  fputs("\(error)\n", stderr)
  exit(1)
}
