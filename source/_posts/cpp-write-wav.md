---
title: C++将PCM音频写入WAV文件的极简处理
lang: zh-CN
date: 2024-06-05 22:58:17
categories:
  - Blog
tags:
  - C++
  - 音频
---

出于项目需要，要记录音频流到文件。音频流的获取是Windows音频会话API（Windows Audio Session API，WASAPI）的标准写法，最开始实验的时候是将PCM直接二进制写入文件，再用Python引SciPy库转为WAV，但这显然在大批量样本下显得很笨拙，所以就研究了一下WAV的文件格式，琢磨出来以下极简写法：
```cpp
// WASAPI的头文件和用法自行查询，这是节选代码

// 头文件变量定义节选，项目用到的是C++/WinRT，所以用了大量的com指针，但能用标准指针的地方我都尽量用了标准指针
int audioDeviceID = 0;
const long long audioCaptureRefreshFrequency = 10000000;
winrt::com_ptr<IMMDeviceEnumerator> pEnumerator{ nullptr };
winrt::com_ptr<IMMDeviceCollection> pDeviceCollection{ nullptr };
winrt::com_ptr<IMMDevice> pDevice{ nullptr };
WAVEFORMATEX* pwfx{ nullptr };
winrt::com_ptr<IAudioCaptureClient> pCaptureClient{ nullptr };
winrt::com_ptr<IAudioClient> pAudioClient{ nullptr };
UINT32 packetLength = 0;
std::unique_ptr<std::fstream> audioWriter;
uint32_t audioSize = 0;


// 函数实现节选
REFERENCE_TIME hnsRequestedDuration = audioCaptureRefreshFrequency;
UINT32 bufferFrameCount;
REFERENCE_TIME hnsActualDuration;
UINT32 numFramesAvailable;
BYTE* pData{ nullptr };
DWORD flags;

CoCreateInstance(__uuidof(MMDeviceEnumerator), nullptr, CLSCTX_INPROC_SERVER, __uuidof(IMMDeviceEnumerator), pEnumerator.put_void());
pEnumerator->EnumAudioEndpoints(eCapture, DEVICE_STATE_ACTIVE, pDeviceCollection.put());
pDeviceCollection->Item(audioDeviceID, pDevice.put());
pDevice->Activate(__uuidof(IAudioClient), CLSCTX_ALL, nullptr, pAudioClient.put_void());
pAudioClient->GetMixFormat(&pwfx);
pAudioClient->Initialize(AUDCLNT_SHAREMODE_SHARED, 0, hnsRequestedDuration, 0, pwfx, nullptr);
pAudioClient->GetBufferSize(&bufferFrameCount);
pAudioClient->GetService(__uuidof(IAudioCaptureClient), pCaptureClient.put_void());

hnsActualDuration = (double)audioCaptureRefreshFrequency * bufferFrameCount / pwfx->nSamplesPerSec;
pAudioClient->Start();

// 创建WAV音频文件
audioWriter = std::make_unique<std::fstream>(std::filesystem::path(L"audio.wav").string(), std::ios::trunc | std::ios::out | std::ios::binary);
// 音频数据大小初始化（字节）
audioSize = 0;
// 写入WAV文件头，这里44个字节的文件头有着明确的含义，请参考WAV具体文件定义格式，除了两个涉及音频数据大小的4字节整型，其他部分都是固定的（这里用到的是16bit位深、16KHz采样率、单通道，WAV格式定义非常简单清楚，如果要改音频流格式，修改对应位置16进制数即可）
audioWriter->write("\x52\x49\x46\x46\x00\x00\x00\x00\x57\x41\x56\x45\x66\x6D\x74\x20\x10\x00\x00\x00\x01\x00\x01\x00\x80\x3E\x00\x00\x00\x7D\x00\x00\x02\x00\x10\x00\x64\x61\x74\x61\x00\x00\x00\x00", 44);

while (isAudioCaptureEnabled && pCaptureClient != nullptr) {
    if (FAILED(pCaptureClient->GetNextPacketSize(&packetLength))) {
        continue;
    }
    pcmNew.clear();
    while (packetLength != 0) {
        if (FAILED(pCaptureClient->GetBuffer(&pData, &numFramesAvailable, &flags, nullptr, nullptr))) {
            break;
        }
    
        if (flags & AUDCLNT_BUFFERFLAGS_SILENT) {
            pData = nullptr;
        }

        float resamplingSum = 0.0f;
        int resamplingCounter = pwfx->nSamplesPerSec / 16000;
        for (int i = 0, c = 1; i < numFramesAvailable * pwfx->nBlockAlign; i += pwfx->nBlockAlign, c++) {
            memcpy(&tempAudioFrame, &(pData[i]), sizeof(tempAudioFrame));
            resamplingSum += tempAudioFrame;
            if (c % resamplingCounter == 0) {
                pcmNew.push_back((int16_t)(resamplingSum / (float)resamplingCounter * 32767.0f));
                resamplingSum = 0.0f;
            }
        }
        
        winrt::check_hresult(pCaptureClient->ReleaseBuffer(numFramesAvailable));
        winrt::check_hresult(pCaptureClient->GetNextPacketSize(&packetLength));
    }
    // 写入本次Buffer中的音频格式
    audioWriter->write((const char*)pcmNew.data(), pcmNew.size() * sizeof(pcmNew[0]));
    // 累加本次音频数据大小
    audioSize += pcmNew.size() * sizeof(pcmNew[0]);

    // 睡眠一半buffer长度后，开启下次循环
    Sleep(hnsActualDuration / audioCaptureRefreshFrequency * 40);
}
```

最后，关闭音频写入流的时候，需要根据最终的音频大小修改文件头指定位置的数据：
```cpp
if (audioWriter != nullptr) {
    audioWriter->seekp(4);
    audioWriter->write((char*)(&audioSize), 4);
    audioWriter->seekp(0x28);
    auto fileSize = audioSize + 36;
    audioWriter->write((char*)(&fileSize), 4);
    audioWriter->close();
}
```

至此，一个超级简单的方法就将PCM音频流写成了播放器能够直接打开的WAV格式音频文件。