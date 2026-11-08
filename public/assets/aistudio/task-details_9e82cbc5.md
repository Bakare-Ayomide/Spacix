---
title: Task Details | Runware Docs
url: https://runware.ai/docs/models-api/task-details
description: Retrieve the original request and response for any previously executed task. Useful for debugging, recovering past results, and auditing API interactions.
relatedDocuments:
  - https://runware.ai/docs/models-api/task-polling
  - https://runware.ai/docs/models-api/errors
---
## Introduction

The `getTaskDetails` task retrieves the **complete request and response objects** for any previously executed task. Pass the `taskUUID` of a past task to recover its original request payload and the API response it produced.

It answers two questions: **what exactly did we send**, when a request failed and the payload is in doubt, and **what did we get back**, when the response was never stored on your side.

**The returned `request` and `response` objects are untyped**, because their structure depends on the original task type. They are the whole objects, exactly as they were sent and received.

> [!NOTE]
> The `taskUUID` in this request refers to the UUID of the task you want to inspect. The response echoes it back along with the original request and response objects.

## Request

The Runware API always accepts an array of objects as input, where each object represents a **specific task to be performed**. The structure of the object varies depending on the type of the task. For this section, we will focus on the parameters related to the **task details task**.

The following JSON snippet shows the basic structure of a request object.

**TypeScript**:

```typescript
import { createClient } from '@runware/sdk'

const client = await createClient({ apiKey: process.env.RUNWARE_API_KEY })
await client.connect()

const result = await client.getTaskDetails({
  taskUUID: 'a770f077-f413-47de-9dac-be0b26a35da6'
})
```

**Python**:

```python
import asyncio
import os

from runware import Runware

async def main():
    async with Runware(api_key=os.environ["RUNWARE_API_KEY"]) as client:
        result = await client.get_task_details({
            "taskUUID": "a770f077-f413-47de-9dac-be0b26a35da6"
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
      "taskType": "getTaskDetails",
      "taskUUID": "a770f077-f413-47de-9dac-be0b26a35da6"
    }
  ]'
```

**CLI**:

```bash
runware result a770f077-f413-47de-9dac-be0b26a35da6
```

**JSON**:

```json
{
  "taskType": "getTaskDetails",
  "taskUUID": "a770f077-f413-47de-9dac-be0b26a35da6"
}
```

---

### [taskType](#request-tasktype)

- **Type**: `string`
- **Required**: true
- **Value**: `getTaskDetails`

Identifier for the type of task being performed.

### [taskUUID](#request-taskuuid)

- **Type**: `string`
- **Required**: true
- **Format**: `UUID v4`

UUID v4 identifier for tracking tasks and matching async responses. Must be unique per task.

## Response

The response always includes the original `request` array and a `response` object. **The `response` is the full API envelope**, carrying either a `data` array if the task completed or an `errors` array if it failed.

Both objects are untyped because their structure depends on the original task type.

### Successful task

When the original task completed successfully, the `response` object contains a `data` array with the results.

```json
{
  "data": [
    {
      "taskType": "getTaskDetails",
      "taskUUID": "a770f077-f413-47de-9dac-be0b26a35da6",
      "request": [
        {
          "taskType": "imageInference",
          "model": "runware:101@1",
          "positivePrompt": "a cat",
          "width": 1024,
          "height": 1024,
          "numberResults": 1,
          "includeCost": true,
          "taskUUID": "a770f077-f413-47de-9dac-be0b26a35da6"
        }
      ],
      "response": {
        "data": [
          {
            "taskType": "imageInference",
            "taskUUID": "a770f077-f413-47de-9dac-be0b26a35da6",
            "imageUUID": "77da2d99-a6d3-44d9-b8c0-ae9fb06b6200",
            "imageURL": "https://im.runware.ai/image/os/a14d18/ws/2/ii/77da2d99-a6d3-44d9-b8c0-ae9fb06b6200.jpg",
            "cost": 0.0013
          }
        ]
      }
    }
  ]
}
```

### Failed task

When the original task failed, the `response` object contains an `errors` array with the error details from the original failure.

```json
{
  "data": [
    {
      "taskType": "getTaskDetails",
      "taskUUID": "b880f077-e514-58ef-0ebd-ce1c37b46eb7",
      "request": [
        {
          "taskType": "imageInference",
          "model": "runware:400@1",
          "positivePrompt": "a landscape",
          "width": 1024,
          "height": 1024,
          "numberResults": 1,
          "inputs": {
            "referenceImages": [
              "https://im.runware.ai/image/ws/5/bucket/media-storage/ii/4e7a91c3-28d5-4f6b-a0e2-7c3d8f1b5a94",
              "https://im.runware.ai/image/ws/5/bucket/media-storage/ii/d2f08b47-9c31-4a85-be6f-5e9a12c7d403",
              "https://im.runware.ai/image/ws/5/bucket/media-storage/ii/8b5c3e19-f7a2-4d60-91c4-a6e8d0f23b71",
              "https://im.runware.ai/image/ws/5/bucket/media-storage/ii/c1d94f6a-3b82-47e5-a5c0-9f2e71d08b36",
              "https://im.runware.ai/image/ws/5/bucket/media-storage/ii/7a0e5d93-6f14-4c28-b9d7-e3c1a84f2650"
            ]
          },
          "taskUUID": "b880f077-e514-58ef-0ebd-ce1c37b46eb7"
        }
      ],
      "response": {
        "errors": [
          {
            "code": "invalidReferenceImagesCount",
            "message": "Invalid number of elements for 'referenceImages' parameter. Reference images must contain between 0 and 4.",
            "parameter": "inputs.referenceImages",
            "type": "string[]",
            "documentation": "https://runware.ai/docs",
            "taskUUID": "b880f077-e514-58ef-0ebd-ce1c37b46eb7"
          }
        ]
      }
    }
  ]
}
```

### Task not found

If the provided `taskUUID` does not exist or belongs to a different organization, the API returns a standard error response.

```json
{
  "data": [],
  "errors": [
    {
      "code": "taskNotFound",
      "message": "No task found for the provided 'taskUUID'. The taskUUID may not exist or may belong to a different organization.",
      "parameter": "taskUUID",
      "type": "string",
      "documentation": "https://runware.ai/docs",
      "taskUUID": "abcdc144-7364-4a7c-b6e4-fadb3dbf2f67"
    }
  ]
}
```

---

### [taskType](#response-tasktype)

- **Type**: `string`
- **Required**: true
- **Value**: `getTaskDetails`

Identifier for the type of task this response belongs to.

### [taskUUID](#response-taskuuid)

- **Type**: `string`
- **Required**: true
- **Format**: `UUID v4`

UUID v4 identifier echoed from the original request, used to match async responses to their tasks.

### [request](#response-request)

- **Type**: `array of objects`
- **Required**: true

The original request array sent for this task. The structure of each object depends on the task type.

### [response](#response-response)

- **Type**: `object`
- **Required**: true

The original API response for this task. Contains a `data` array when the task completed successfully, or an `errors` array when the task failed.