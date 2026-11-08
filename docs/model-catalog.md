# Model Catalog (`docs/model-catalog.md`)

All models verified against the Higgsfield REST API (`https://docs.higgsfield.ai/docs/models.md`) and `higgsfield-ai/app-templates`.

## 1. Verified Live Models (In Model Picker)

| Model ID | Surface | Family / Provider | REST Path(s) | Input Modes | Settings | Base HF USD | Credits (2x Markup) | Status |
|---|---|---|---|---|---|---|---|---|
| `soul-2-standard` | `image` | Lumen / Higgsfield Soul | `higgsfield-ai/soul/v2/standard` | Text, Reference (up to 4) | `aspect_ratio`, `resolution`, `enhance_prompt`, `guidance_scale` | $0.04 / img | 8 | **Live** |
| `soul-cinema` | `image` | Lumen / Higgsfield Soul | `higgsfield-ai/soul/cinema` | Text, Reference (up to 4) | `aspect_ratio`, `resolution`, `cinema_lut`, `enhance_prompt` | $0.06 / img | 12 | **Live** |
| `flux-2-pro` | `image` | Black Forest Labs | `flux-2-pro` | Text, Image-to-Image | `aspect_ratio`, `resolution`, `safety_tolerance`, `seed` | $0.05 / img | 10 | **Live** |
| `grok-imagine-image-2` | `image` | xAI | `xai/grok-imagine-image-2.0` | Text, Reference (up to 2) | `aspect_ratio`, `style_preset`, `enhance_prompt` | $0.05 / img | 10 | **Live** |
| `ideogram-v4` | `image` | Ideogram | `ideogram/v4.0` | Text, Reference (up to 3) | `aspect_ratio`, `style_type`, `magic_prompt` | $0.06 / img | 12 | **Live** |
| `qwen-image-3` | `image` | Alibaba Qwen | `alibaba/qwen-image-3/text-to-image` | Text | `aspect_ratio`, `resolution`, `enhance_prompt` | $0.03 / img | 6 | **Live** |
| `recraft-v4-1` | `image` | Recraft | `recraft/v4.1/text-to-image` | Text | `aspect_ratio`, `substyle`, `resolution` | $0.04 / img | 8 | **Live** |
| `z-image-turbo` | `image` | Z-Image | `z-image/turbo` | Text | `aspect_ratio`, `num_inference_steps` | $0.02 / img | 4 | **Live** |
| `seedance-2-5` | `video` | ByteDance Seedance | `bytedance/seedance-2.5`, `bytedance/seedance-2.5/video-edit`, `bytedance/seedance-2.5/video-extend` | Text, First/Last Frame, Video Edit, Video Extend | `aspect_ratio`, `duration`, `resolution`, `camera_motion` | $0.06 / sec | 60 (5s) | **Live** |
| `seedance-2-0-fast` | `video` | ByteDance Seedance | `bytedance/seedance-2.0/fast` | Text, First Frame | `aspect_ratio`, `duration`, `resolution` | $0.03 / sec | 30 (5s) | **Live** |
| `kling-3-0-pro` | `video` | Kuaishou Kling | `kling-video/v3.0/pro` | Text, First/Last Frame, Reference | `aspect_ratio`, `duration`, `resolution`, `cfg_scale` | $0.08 / sec | 80 (5s) | **Live** |
| `kling-3-0-turbo` | `video` | Kuaishou Kling | `kling-video/v3.0-turbo/text-to-video` | Text, First Frame | `aspect_ratio`, `duration`, `resolution` | $0.04 / sec | 40 (5s) | **Live** |
| `kling-3-0-motion` | `video` | Kuaishou Kling | `kling-video/v3/motion-control/pro` | Source Image + Motion Video | `aspect_ratio`, `duration`, `motion_strength` | $0.09 / sec | 90 (5s) | **Live** |
| `kling-o3-frames` | `video` | Kuaishou Kling | `kling-video/o3/first-last-frame` | First & Last Frame | `aspect_ratio`, `duration`, `resolution` | $0.07 / sec | 70 (5s) | **Live** |
| `wan-3-0-prime` | `video` | Alibaba Wan | `alibaba/wan-3.0-prime/text-to-video` | Text, First Frame, Reference | `aspect_ratio`, `duration`, `resolution`, `enable_audio` | $0.06 / sec | 60 (5s) | **Live** |
| `minimax-h3` | `video` | MiniMax Hailuo | `minimax/h3/text-to-video` | Text, First Frame | `aspect_ratio`, `duration`, `resolution` | $0.05 / sec | 50 (5s) | **Live** |
| `ltx-2-5-pro` | `video` | Lightricks LTX | `lightricks/ltx-2.5/text-to-video/pro` | Text, First Frame | `aspect_ratio`, `duration`, `resolution`, `fps` | $0.04 / sec | 40 (5s) | **Live** |
| `pixverse-v6` | `video` | PixVerse | `pixverse/v6/text-to-video` | Text, First/Last Frame | `aspect_ratio`, `duration`, `resolution`, `motion_mode` | $0.04 / sec | 40 (5s) | **Live** |
| `grok-imagine-video-1-5` | `video` | xAI | `xai/grok-imagine-video/v1.5/reference-to-video` | Text, Reference | `aspect_ratio`, `duration`, `resolution` | $0.06 / sec | 60 (5s) | **Live** |
| `flux-3-video` | `video` | Black Forest Labs | `blackforestlabs/flux-3/text-to-video` | Text, First Frame | `aspect_ratio`, `duration`, `resolution` | $0.07 / sec | 70 (5s) | **Live** |
| `higgsfield-dop-lite` | `video` | Lumen / DoP | `higgsfield-ai/dop/lite` | Start Frame + Camera Preset | `aspect_ratio`, `duration`, `camera_rig`, `lens_mm` | $0.25 / gen | 50 | **Live** |
| `seed-audio-v1` | `audio` | ByteDance Seed Audio | `bytedance/seed-audio/v1/text-to-audio` | Text, Reference Audio | `duration`, `audio_format`, `sample_rate` | $0.02 / gen | 8 | **Live** |
| `sonilo-music-v2` | `audio` | Sonilo | `sonilo/v2/music-generation` | Text, Reference Audio | `duration`, `genre_hint`, `instrumental_only` | $0.05 / gen | 15 | **Live** |
| `inworld-tts-studio` | `audio` | Inworld Voice | `inworld/tts/v1/synthesize` | Text, Reference Voice | `voice_persona`, `speaking_rate`, `emotion` | $0.015 / gen | 6 | **Live** |
| `mirelo-sfx-pro` | `audio` | Mirelo Audio | `mirelo/v1/text-to-sfx` | Text, Reference Video/Audio | `duration`, `atmosphere_density`, `stereo_width` | $0.02 / gen | 8 | **Live** |

## 2. Unverified / Web-Only Models (Excluded from Picker per §0 Rule 2)

| Candidate Model | Reason / Status |
|---|---|
| `nano_banana_2` / `gpt_image_2` (Higgsfield CLI names) | Job-set identifiers from internal CLI, not direct public REST endpoints (`Not in API`) |
| `Soul Cast` / `Soul Location` | Web-app internal workflows (`Not in API`) |
| `Cinema Studio Timeline` / `Marketing Studio` | Multi-shot web editor features (`Out of scope v1 / Not in API`) |
| `Soul ID Character Training` | Deferred to v2 per §13 |
