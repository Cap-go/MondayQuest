import AppKit
import ImageIO
import Vision

guard let image = NSImage(contentsOfFile: CommandLine.arguments[1]),
      let cgImage = image.cgImage(forProposedRect: nil, context: nil, hints: nil) else {
    fatalError("Cannot open simulator screenshot")
}
if CommandLine.arguments.count == 3 {
    guard let context = CGContext(data: nil, width: cgImage.width, height: cgImage.height, bitsPerComponent: 8, bytesPerRow: 0, space: cgImage.colorSpace ?? CGColorSpaceCreateDeviceRGB(), bitmapInfo: CGImageAlphaInfo.noneSkipLast.rawValue) else {
        fatalError("Cannot create RGB screenshot context")
    }
    context.setBlendMode(.copy)
    context.draw(cgImage, in: CGRect(x: 0, y: 0, width: cgImage.width, height: cgImage.height))
    guard let rgbImage = context.makeImage(),
          let destination = CGImageDestinationCreateWithURL(URL(fileURLWithPath: CommandLine.arguments[2]) as CFURL, "public.png" as CFString, 1, nil) else {
        fatalError("Cannot create RGB PNG")
    }
    CGImageDestinationAddImage(destination, rgbImage, nil)
    guard CGImageDestinationFinalize(destination) else { fatalError("Cannot save RGB PNG") }
    exit(0)
}
let request = VNRecognizeTextRequest()
request.recognitionLevel = .accurate
request.usesLanguageCorrection = false
try VNImageRequestHandler(cgImage: cgImage).perform([request])
for observation in request.results ?? [] {
    guard let candidate = observation.topCandidates(1).first else { continue }
    print("\(candidate.string)\t\(observation.boundingBox.midX)\t\(1 - observation.boundingBox.midY)")
}
