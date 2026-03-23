import AVFoundation
import ExpoModulesCore
import Speech

public final class ClawketSpeechRecognitionModule: Module {
  private let resultEvent = "onSpeechResult"
  private let stateEvent = "onSpeechState"
  private let errorEvent = "onSpeechError"
  private let levelEvent = "onSpeechLevel"

  private var recognitionSession: AnyObject?

  public func definition() -> ModuleDefinition {
    Name("ClawketSpeechRecognition")

    Events(resultEvent, stateEvent, errorEvent, levelEvent)

    AsyncFunction("isAvailableAsync") { (localeIdentifier: String?, promise: Promise) in
      Task {
        let locale = self.resolvedLocale(from: localeIdentifier)
        let isAvailable = await self.isRecognitionAvailable(for: locale)
        promise.resolve(isAvailable)
      }
    }.runOnQueue(.main)

    AsyncFunction("requestPermissionsAsync") { (promise: Promise) in
      self.requestPermissions(promise: promise)
    }.runOnQueue(.main)

    AsyncFunction("startAsync") { (localeIdentifier: String?, promise: Promise) in
      let locale = self.resolvedLocale(from: localeIdentifier)
      Task {
        await self.startRecognition(locale: locale, promise: promise)
      }
    }.runOnQueue(.main)

    AsyncFunction("stopAsync") { (promise: Promise) in
      Task {
        await self.stopRecognition(notifyState: true)
        promise.resolve(nil)
      }
    }.runOnQueue(.main)

    OnDestroy {
      Task {
        await self.stopRecognition(notifyState: false)
      }
    }
  }

  private func requestPermissions(promise: Promise) {
    requestSpeechAuthorization { speechGranted in
      self.requestMicrophoneAuthorization { microphoneGranted in
        promise.resolve([
          "speechGranted": speechGranted,
          "microphoneGranted": microphoneGranted,
        ])
      }
    }
  }

  private func isRecognitionAvailable(for locale: Locale) async -> Bool {
    guard #available(iOS 26.0, *) else {
      return false
    }
    return await AdvancedSpeechRecognitionSession.isAvailable(for: locale)
  }

  private func startRecognition(locale: Locale, promise: Promise) async {
    guard currentSpeechAuthorizationGranted() else {
      promise.reject("ERR_SPEECH_PERMISSION_DENIED", "Speech recognition permission has not been granted.")
      return
    }
    guard currentMicrophoneAuthorizationGranted() else {
      promise.reject("ERR_MICROPHONE_PERMISSION_DENIED", "Microphone permission has not been granted.")
      return
    }
    guard #available(iOS 26.0, *) else {
      promise.reject("ERR_SPEECH_UNAVAILABLE", "The latest voice input mode requires iOS 26 or later.")
      return
    }

    await stopRecognition(notifyState: false)

    do {
      let session = AdvancedSpeechRecognitionSession(
        locale: locale,
        onResult: { [weak self] transcript, isFinal in
          guard let self else {
            return
          }
          Task { @MainActor in
            self.sendEvent(self.resultEvent, [
              "transcript": transcript,
              "isFinal": isFinal,
            ])
          }
        },
        onStateChange: { [weak self] state in
          guard let self else {
            return
          }
          Task { @MainActor in
            self.sendEvent(self.stateEvent, ["state": state])
          }
        },
        onError: { [weak self] code, message in
          guard let self else {
            return
          }
          Task { @MainActor in
            self.sendEvent(self.errorEvent, [
              "code": code,
              "message": message,
            ])
          }
        },
        onLevel: { [weak self] level in
          guard let self else {
            return
          }
          Task { @MainActor in
            self.sendEvent(self.levelEvent, ["level": level])
          }
        }
      )
      recognitionSession = session
      try await session.start()
      promise.resolve(nil)
    } catch let error as AdvancedSpeechRecognitionSession.SessionError {
      recognitionSession = nil
      promise.reject(error.code, error.errorDescription ?? error.code)
    } catch {
      recognitionSession = nil
      promise.reject("ERR_SPEECH_START_FAILED", error.localizedDescription)
    }
  }

  private func stopRecognition(notifyState: Bool) async {
    guard #available(iOS 26.0, *) else {
      recognitionSession = nil
      return
    }
    guard let session = recognitionSession as? AdvancedSpeechRecognitionSession else {
      recognitionSession = nil
      if notifyState {
        sendEvent(stateEvent, ["state": "idle"])
      }
      return
    }
    recognitionSession = nil
    await session.stop(notifyState: notifyState)
  }

  private func resolvedLocale(from localeIdentifier: String?) -> Locale {
    guard let localeIdentifier, !localeIdentifier.isEmpty else {
      return Locale.current
    }
    return Locale(identifier: localeIdentifier)
  }

  private func currentSpeechAuthorizationGranted() -> Bool {
    SFSpeechRecognizer.authorizationStatus() == .authorized
  }

  private func currentMicrophoneAuthorizationGranted() -> Bool {
    AVAudioSession.sharedInstance().recordPermission == .granted
  }

  private func requestSpeechAuthorization(completion: @escaping (Bool) -> Void) {
    SFSpeechRecognizer.requestAuthorization { status in
      DispatchQueue.main.async {
        completion(status == .authorized)
      }
    }
  }

  private func requestMicrophoneAuthorization(completion: @escaping (Bool) -> Void) {
    AVAudioSession.sharedInstance().requestRecordPermission { granted in
      DispatchQueue.main.async {
        completion(granted)
      }
    }
  }
}

@available(iOS 26.0, *)
private final class AdvancedSpeechRecognitionSession: NSObject {
  enum SessionError: LocalizedError {
    case unavailable
    case localeUnavailable
    case assetUnsupported
    case audioFormatUnavailable
    case audioBufferCreationFailed
    case audioConversionFailed

    var code: String {
      switch self {
      case .unavailable:
        return "ERR_SPEECH_UNAVAILABLE"
      case .localeUnavailable:
        return "ERR_SPEECH_LOCALE_UNAVAILABLE"
      case .assetUnsupported:
        return "ERR_SPEECH_ASSET_UNSUPPORTED"
      case .audioFormatUnavailable:
        return "ERR_SPEECH_AUDIO_FORMAT_UNAVAILABLE"
      case .audioBufferCreationFailed:
        return "ERR_SPEECH_AUDIO_BUFFER_FAILED"
      case .audioConversionFailed:
        return "ERR_SPEECH_AUDIO_CONVERSION_FAILED"
      }
    }

    var errorDescription: String? {
      switch self {
      case .unavailable:
        return "The latest voice input mode is unavailable on this iPhone."
      case .localeUnavailable:
        return "The latest voice input mode does not support the requested language."
      case .assetUnsupported:
        return "The latest voice input assets are unavailable on this iPhone."
      case .audioFormatUnavailable:
        return "Unable to configure a compatible audio format for voice input."
      case .audioBufferCreationFailed:
        return "Unable to prepare audio for voice input."
      case .audioConversionFailed:
        return "Unable to convert microphone audio for voice input."
      }
    }
  }

  private let locale: Locale
  private let onResult: @Sendable (String, Bool) -> Void
  private let onStateChange: @Sendable (String) -> Void
  private let onError: @Sendable (String, String) -> Void
  private let onLevel: @Sendable (Double) -> Void

  private let audioEngine = AVAudioEngine()
  private var audioConverter: AVAudioConverter?
  private var targetAudioFormat: AVAudioFormat?
  private var reservedLocale: Locale?
  private var analyzer: SpeechAnalyzer?
  private var transcriber: SpeechTranscriber?
  private var inputContinuation: AsyncStream<AnalyzerInput>.Continuation?
  private var analyzerTask: Task<Void, Error>?
  private var resultsTask: Task<Void, Never>?
  private var stopTask: Task<Void, Never>?
  private var didSendIdleState = false
  private var isStopping = false
  private var lastLevelEventAt: CFTimeInterval = 0

  init(
    locale: Locale,
    onResult: @escaping @Sendable (String, Bool) -> Void,
    onStateChange: @escaping @Sendable (String) -> Void,
    onError: @escaping @Sendable (String, String) -> Void,
    onLevel: @escaping @Sendable (Double) -> Void
  ) {
    self.locale = locale
    self.onResult = onResult
    self.onStateChange = onStateChange
    self.onError = onError
    self.onLevel = onLevel
    super.init()
  }

  static func isAvailable(for locale: Locale) async -> Bool {
    guard SpeechTranscriber.isAvailable else {
      return false
    }
    guard let supportedLocale = await SpeechTranscriber.supportedLocale(equivalentTo: locale) else {
      return false
    }
    let transcriber = SpeechTranscriber(locale: supportedLocale, preset: .progressiveTranscription)
    let modules: [any SpeechModule] = [transcriber]
    let status = await AssetInventory.status(forModules: modules)
    return status != .unsupported
  }

  func start() async throws {
    guard SpeechTranscriber.isAvailable else {
      throw SessionError.unavailable
    }

    let supportedLocale = await SpeechTranscriber.supportedLocale(equivalentTo: locale)
    guard let supportedLocale else {
      throw SessionError.localeUnavailable
    }

    let transcriber = SpeechTranscriber(
      locale: supportedLocale,
      preset: .progressiveTranscription
    )
    self.transcriber = transcriber

    let modules: [any SpeechModule] = [transcriber]
    let assetStatus = await AssetInventory.status(forModules: modules)
    switch assetStatus {
    case .unsupported:
      throw SessionError.assetUnsupported
    case .supported, .downloading:
      if let installationRequest = try await AssetInventory.assetInstallationRequest(supporting: modules) {
        try await installationRequest.downloadAndInstall()
      }
    case .installed:
      break
    @unknown default:
      throw SessionError.assetUnsupported
    }

    let didReserveLocale = try? await AssetInventory.reserve(locale: supportedLocale)
    if didReserveLocale == true {
      reservedLocale = supportedLocale
    }

    do {
      let analyzer = SpeechAnalyzer(modules: modules)
      self.analyzer = analyzer

      let audioSession = AVAudioSession.sharedInstance()
      try audioSession.setCategory(.record, mode: .measurement, options: [.duckOthers, .allowBluetoothHFP])
      try audioSession.setActive(true, options: .notifyOthersOnDeactivation)

      let inputNode = audioEngine.inputNode
      let naturalFormat = inputNode.outputFormat(forBus: 0)
      let preferredFormat = await SpeechAnalyzer.bestAvailableAudioFormat(
        compatibleWith: modules,
        considering: naturalFormat
      )
      let fallbackFormat = await SpeechAnalyzer.bestAvailableAudioFormat(compatibleWith: modules)
      let bestFormat = preferredFormat ?? fallbackFormat
      guard let bestFormat else {
        throw SessionError.audioFormatUnavailable
      }

      targetAudioFormat = bestFormat
      if !formatsMatch(naturalFormat, bestFormat) {
        audioConverter = AVAudioConverter(from: naturalFormat, to: bestFormat)
      }

      try await analyzer.prepareToAnalyze(in: bestFormat)

      let inputStream = AsyncStream<AnalyzerInput> { continuation in
        self.inputContinuation = continuation
      }

      analyzerTask = Task {
        try await analyzer.start(inputSequence: inputStream)
      }

      let onResult = self.onResult
      let emitError = self.onError
      let isStopping: @Sendable () -> Bool = { [weak self] in
        self?.isStopping ?? true
      }

      resultsTask = Task {
        do {
          for try await result in transcriber.results {
            let transcript = String(result.text.characters)
            await MainActor.run {
              onResult(transcript, result.isFinal)
            }
          }
        } catch is CancellationError {
          return
        } catch {
          await MainActor.run {
            guard !isStopping() else {
              return
            }
            emitError("ERR_SPEECH_RECOGNITION_FAILED", error.localizedDescription)
          }
        }
      }

      inputNode.removeTap(onBus: 0)
      inputNode.installTap(onBus: 0, bufferSize: 1024, format: naturalFormat) { [weak self] buffer, _ in
        self?.handleAudioBuffer(buffer)
      }

      audioEngine.prepare()
      try audioEngine.start()
      didSendIdleState = false
      onStateChange("listening")
    } catch {
      await stop(notifyState: false)
      throw error
    }
  }

  func stop(notifyState: Bool) async {
    if let stopTask {
      await stopTask.value
      if notifyState && !didSendIdleState {
        didSendIdleState = true
        onStateChange("idle")
      }
      return
    }

    let task = Task { [weak self] in
      guard let self else {
        return
      }
      self.isStopping = true
      self.audioEngine.inputNode.removeTap(onBus: 0)
      if self.audioEngine.isRunning {
        self.audioEngine.stop()
      }
      self.inputContinuation?.finish()
      self.inputContinuation = nil

      if let analyzer = self.analyzer {
        do {
          try await analyzer.finalizeAndFinishThroughEndOfInput()
        } catch {
          await analyzer.cancelAndFinishNow()
        }
      }

      if let analyzerTask = self.analyzerTask {
        _ = try? await analyzerTask.value
      }

      self.resultsTask?.cancel()
      await self.resultsTask?.value

      self.analyzerTask = nil
      self.resultsTask = nil
      self.analyzer = nil
      self.transcriber = nil
      self.audioConverter = nil
      self.targetAudioFormat = nil
      self.lastLevelEventAt = 0

      if let reservedLocale = self.reservedLocale {
        _ = await AssetInventory.release(reservedLocale: reservedLocale)
      }
      self.reservedLocale = nil

      do {
        try AVAudioSession.sharedInstance().setActive(false, options: .notifyOthersOnDeactivation)
      } catch {
        // Ignore audio session teardown failures.
      }

      self.isStopping = false
    }

    stopTask = task
    await task.value
    stopTask = nil

    if notifyState && !didSendIdleState {
      didSendIdleState = true
      onStateChange("idle")
    }
  }

  private func handleAudioBuffer(_ buffer: AVAudioPCMBuffer) {
    guard !isStopping else {
      return
    }

    emitAudioLevelIfNeeded(from: buffer)

    do {
      let analyzerBuffer = try prepareAnalyzerBuffer(from: buffer)
      inputContinuation?.yield(AnalyzerInput(buffer: analyzerBuffer))
    } catch let error as SessionError {
      emitErrorIfNeeded(code: error.code, message: error.errorDescription ?? error.code)
      Task {
        await self.stop(notifyState: true)
      }
    } catch {
      emitErrorIfNeeded(code: "ERR_SPEECH_AUDIO_BUFFER_FAILED", message: error.localizedDescription)
      Task {
        await self.stop(notifyState: true)
      }
    }
  }

  private func prepareAnalyzerBuffer(from inputBuffer: AVAudioPCMBuffer) throws -> AVAudioPCMBuffer {
    guard let targetAudioFormat else {
      throw SessionError.audioFormatUnavailable
    }

    if formatsMatch(inputBuffer.format, targetAudioFormat) {
      return try copyBuffer(inputBuffer, format: targetAudioFormat)
    }

    guard let audioConverter else {
      throw SessionError.audioConversionFailed
    }

    let frameRatio = targetAudioFormat.sampleRate / inputBuffer.format.sampleRate
    let estimatedFrameCapacity = max(AVAudioFrameCount(Double(inputBuffer.frameLength) * frameRatio) + 32, 32)
    guard let convertedBuffer = AVAudioPCMBuffer(
      pcmFormat: targetAudioFormat,
      frameCapacity: estimatedFrameCapacity
    ) else {
      throw SessionError.audioBufferCreationFailed
    }

    var didProvideInput = false
    var conversionError: NSError?
    let status = audioConverter.convert(to: convertedBuffer, error: &conversionError) { _, outputStatus in
      if didProvideInput {
        outputStatus.pointee = .noDataNow
        return nil
      }
      didProvideInput = true
      outputStatus.pointee = .haveData
      return inputBuffer
    }

    if let conversionError {
      throw conversionError
    }
    guard status == .haveData || status == .inputRanDry else {
      throw SessionError.audioConversionFailed
    }
    return convertedBuffer
  }

  private func copyBuffer(_ buffer: AVAudioPCMBuffer, format: AVAudioFormat) throws -> AVAudioPCMBuffer {
    guard let copiedBuffer = AVAudioPCMBuffer(pcmFormat: format, frameCapacity: buffer.frameLength) else {
      throw SessionError.audioBufferCreationFailed
    }
    copiedBuffer.frameLength = buffer.frameLength

    let frameLength = Int(buffer.frameLength)
    let channelCount = Int(format.channelCount)

    switch format.commonFormat {
    case .pcmFormatFloat32:
      guard let sourceChannels = buffer.floatChannelData, let destinationChannels = copiedBuffer.floatChannelData else {
        throw SessionError.audioBufferCreationFailed
      }
      for channel in 0..<channelCount {
        memcpy(destinationChannels[channel], sourceChannels[channel], frameLength * MemoryLayout<Float>.size)
      }
    case .pcmFormatInt16:
      guard let sourceChannels = buffer.int16ChannelData, let destinationChannels = copiedBuffer.int16ChannelData else {
        throw SessionError.audioBufferCreationFailed
      }
      for channel in 0..<channelCount {
        memcpy(destinationChannels[channel], sourceChannels[channel], frameLength * MemoryLayout<Int16>.size)
      }
    case .pcmFormatInt32:
      guard let sourceChannels = buffer.int32ChannelData, let destinationChannels = copiedBuffer.int32ChannelData else {
        throw SessionError.audioBufferCreationFailed
      }
      for channel in 0..<channelCount {
        memcpy(destinationChannels[channel], sourceChannels[channel], frameLength * MemoryLayout<Int32>.size)
      }
    default:
      throw SessionError.audioBufferCreationFailed
    }

    return copiedBuffer
  }

  private func formatsMatch(_ lhs: AVAudioFormat, _ rhs: AVAudioFormat) -> Bool {
    lhs.sampleRate == rhs.sampleRate &&
      lhs.channelCount == rhs.channelCount &&
      lhs.commonFormat == rhs.commonFormat &&
      lhs.isInterleaved == rhs.isInterleaved
  }

  private func emitErrorIfNeeded(code: String, message: String) {
    guard !isStopping else {
      return
    }
    onError(code, message)
  }

  private func emitAudioLevelIfNeeded(from buffer: AVAudioPCMBuffer) {
    let now = CACurrentMediaTime()
    guard now - lastLevelEventAt >= 0.05 else {
      return
    }
    lastLevelEventAt = now
    onLevel(normalizedAudioLevel(from: buffer))
  }

  private func normalizedAudioLevel(from buffer: AVAudioPCMBuffer) -> Double {
    guard buffer.frameLength > 0 else {
      return 0
    }

    switch buffer.format.commonFormat {
    case .pcmFormatFloat32:
      return normalizedFloat32RMS(from: buffer)
    case .pcmFormatInt16:
      return normalizedInt16RMS(from: buffer)
    case .pcmFormatInt32:
      return normalizedInt32RMS(from: buffer)
    default:
      return 0
    }
  }

  private func normalizedFloat32RMS(from buffer: AVAudioPCMBuffer) -> Double {
    guard let channels = buffer.floatChannelData else {
      return 0
    }
    return normalizedRMS(
      channelCount: Int(buffer.format.channelCount),
      frameLength: Int(buffer.frameLength)
    ) { channel, frame in
      Double(channels[channel][frame])
    }
  }

  private func normalizedInt16RMS(from buffer: AVAudioPCMBuffer) -> Double {
    guard let channels = buffer.int16ChannelData else {
      return 0
    }
    return normalizedRMS(
      channelCount: Int(buffer.format.channelCount),
      frameLength: Int(buffer.frameLength)
    ) { channel, frame in
      Double(channels[channel][frame]) / Double(Int16.max)
    }
  }

  private func normalizedInt32RMS(from buffer: AVAudioPCMBuffer) -> Double {
    guard let channels = buffer.int32ChannelData else {
      return 0
    }
    return normalizedRMS(
      channelCount: Int(buffer.format.channelCount),
      frameLength: Int(buffer.frameLength)
    ) { channel, frame in
      Double(channels[channel][frame]) / Double(Int32.max)
    }
  }

  private func normalizedRMS(
    channelCount: Int,
    frameLength: Int,
    sampleAt: (_ channel: Int, _ frame: Int) -> Double
  ) -> Double {
    var sum: Double = 0
    let safeChannelCount = max(channelCount, 0)
    let safeFrameLength = max(frameLength, 0)

    guard safeChannelCount > 0, safeFrameLength > 0 else {
      return 0
    }

    for channel in 0..<safeChannelCount {
      for frame in 0..<safeFrameLength {
        let sample = sampleAt(channel, frame)
        sum += sample * sample
      }
    }

    let totalSamples = safeChannelCount * safeFrameLength
    let rms = sqrt(sum / Double(totalSamples))
    let boosted = min(max(rms * 5.5, 0), 1)
    return boosted
  }
}
