---
title: Media Storage | Runware Docs
url: https://runware.ai/docs/models-api/media-storage
description: Upload media to your Runware storage or delete it by UUID, for any image, video, audio, or 3D model input reused across the API.
relatedDocuments:
  - https://runware.ai/docs/learn/image-to-image
  - https://runware.ai/docs/learn/image-inpainting
---
## Introduction

The `mediaStorage` task **stores media in your Runware account and returns a reusable UUID**, so you can hand an image, video, audio, or 3D model to any task that accepts media inputs without re-uploading it each time. It also **deletes stored media** when you no longer need it.

Every call is a single `operation`, either an `upload` or a `delete`, sent as one task object in the usual request array.

## Upload

An `upload` takes the media as a **publicly accessible URL, a data URI, or a base64 string**, stores it, and returns a `mediaUUID` and `mediaURL` you can reuse as input anywhere in the API.

### Request

**TypeScript**:

```typescript
import { createClient } from '@runware/sdk'

const client = await createClient({ apiKey: process.env.RUNWARE_API_KEY })
await client.connect()

const result = await client.mediaStorage({
  operation: 'upload',
  media: 'data:image/png;base64,iVBORw0KGgo...'
})
```

**Python**:

```python
import asyncio
import os

from runware import Runware

async def main():
    async with Runware(api_key=os.environ["RUNWARE_API_KEY"]) as client:
        result = await client.media_storage({
            "operation": "upload",
            "media": "data:image/png;base64,iVBORw0KGgo..."
        })

asyncio.run(main())
```

**cURL**:

```bash
curl https://api.runware.ai/v1 \
  -H "Authorization: Bearer $RUNWARE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '[
    {
      "taskType": "mediaStorage",
      "taskUUID": "50836053-a0ee-4cf5-b9d6-ae7c5d140ada",
      "operation": "upload",
      "media": "data:image/png;base64,iVBORw0KGgo..."
    }
  ]'
```

**CLI**:

```bash
runware media upload "data:image/png;base64,iVBORw0KGgo..."
```

**JSON**:

```json
{
  "taskType": "mediaStorage",
  "taskUUID": "50836053-a0ee-4cf5-b9d6-ae7c5d140ada",
  "operation": "upload",
  "media": "data:image/png;base64,iVBORw0KGgo..."
}
```

---

### [taskType](#request-tasktype)

- **Type**: `string`
- **Required**: true
- **Value**: `mediaStorage`

Identifier for the type of task being performed.

### [taskUUID](#request-taskuuid)

- **Type**: `string`
- **Required**: true
- **Format**: `UUID v4`

UUID v4 identifier for tracking tasks and matching async responses. Must be unique per task.

### [operation](#request-operation)

- **Type**: `string`
- **Required**: true
- **Value**: `upload`

Store new media and return its UUID and URL.

### [media](#request-media)

- **Type**: `string`
- **Required**: true

For upload, the media as a publicly accessible URL, data URI, or base64 string. For delete, the mediaUUID of the media to remove.

### Response

The response returns the stored media's **UUID and URL**.

```json
{
  "data": [
    {
      "taskType": "mediaStorage",
      "taskUUID": "50836053-a0ee-4cf5-b9d6-ae7c5d140ada",
      "operation": "upload",
      "mediaUUID": "989ba605-1449-4e1e-b462-cd83ec9c1a67",
      "mediaURL": "https://mm.runware.ai/media-storage/ws/2/id/989ba605-1449-4e1e-b462-cd83ec9c1a67.png"
    }
  ]
}
```

---

### [taskType](#response-tasktype)

- **Type**: `string`
- **Required**: true
- **Value**: `mediaStorage`

Identifier for the type of task this response belongs to.

### [taskUUID](#response-taskuuid)

- **Type**: `string`
- **Required**: true
- **Format**: `UUID v4`

UUID v4 identifier echoed from the original request, used to match async responses to their tasks.

### [operation](#response-operation)

- **Type**: `string`
- **Required**: true
- **Value**: `upload`

The media storage operation that produced this response.

### [mediaUUID](#response-mediauuid)

- **Type**: `string`
- **Required**: true
- **Format**: `UUID v4`

UUID of the stored media.

### [mediaURL](#response-mediaurl)

- **Type**: `string`
- **Required**: true
- **Format**: `uri`

URL where the stored media is accessible.

## Delete

A `delete` removes media you stored earlier. Pass its `mediaUUID` as the `media` value.

### Request

**TypeScript**:

```typescript
import { createClient } from '@runware/sdk'

const client = await createClient({ apiKey: process.env.RUNWARE_API_KEY })
await client.connect()

const result = await client.mediaStorage({
  operation: 'delete',
  media: '989ba605-1449-4e1e-b462-cd83ec9c1a67'
})
```

**Python**:

```python
import asyncio
import os

from runware import Runware

async def main():
    async with Runware(api_key=os.environ["RUNWARE_API_KEY"]) as client:
        result = await client.media_storage({
            "operation": "delete",
            "media": "989ba605-1449-4e1e-b462-cd83ec9c1a67"
        })

asyncio.run(main())
```

**cURL**:

```bash
curl https://api.runware.ai/v1 \
  -H "Authorization: Bearer $RUNWARE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '[
    {
      "taskType": "mediaStorage",
      "taskUUID": "b7e0a3f2-3c1a-4d9e-8f2b-1a2c3d4e5f60",
      "operation": "delete",
      "media": "989ba605-1449-4e1e-b462-cd83ec9c1a67"
    }
  ]'
```

**CLI**:

```bash
runware media delete 989ba605-1449-4e1e-b462-cd83ec9c1a67
```

**JSON**:

```json
{
  "taskType": "mediaStorage",
  "taskUUID": "b7e0a3f2-3c1a-4d9e-8f2b-1a2c3d4e5f60",
  "operation": "delete",
  "media": "989ba605-1449-4e1e-b462-cd83ec9c1a67"
}
```

---

### [taskType](#request-tasktype)

- **Type**: `string`
- **Required**: true
- **Value**: `mediaStorage`

Identifier for the type of task being performed.

### [taskUUID](#request-taskuuid)

- **Type**: `string`
- **Required**: true
- **Format**: `UUID v4`

UUID v4 identifier for tracking tasks and matching async responses. Must be unique per task.

### [operation](#request-operation)

- **Type**: `string`
- **Required**: true
- **Value**: `delete`

Permanently remove previously stored media by its UUID.

### [media](#request-media)

- **Type**: `string`
- **Required**: true

For upload, the media as a publicly accessible URL, data URI, or base64 string. For delete, the mediaUUID of the media to remove.

### Response

The response returns the **deleted media's UUID**, so you can confirm what was removed.

```json
{
  "data": [
    {
      "taskType": "mediaStorage",
      "taskUUID": "b7e0a3f2-3c1a-4d9e-8f2b-1a2c3d4e5f60",
      "operation": "delete",
      "mediaUUID": "989ba605-1449-4e1e-b462-cd83ec9c1a67"
    }
  ]
}
```

---

### [taskType](#response-tasktype)

- **Type**: `string`
- **Required**: true
- **Value**: `mediaStorage`

Identifier for the type of task this response belongs to.

### [taskUUID](#response-taskuuid)

- **Type**: `string`
- **Required**: true
- **Format**: `UUID v4`

UUID v4 identifier echoed from the original request, used to match async responses to their tasks.

### [operation](#response-operation)

- **Type**: `string`
- **Required**: true
- **Value**: `delete`

The media storage operation that produced this response.

### [mediaUUID](#response-mediauuid)

- **Type**: `string`
- **Required**: true
- **Format**: `UUID v4`

UUID of the stored media.