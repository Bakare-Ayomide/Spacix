---
title: Model Search API | Runware Docs
url: https://runware.ai/docs/models-api/model-search
description: Search and discover AI models available in the Runware platform. Filter and find the right model for your generation tasks.
relatedDocuments:
  - https://runware.ai/docs/learn/text-to-image
  - https://runware.ai/docs/models-api/model-upload
  - https://runware.ai/docs/models-api/introduction
---
## Introduction

The Model Search API finds models on the Runware platform across two sources: **official models**, which Runware integrates and maintains in its catalog, and **community models**, published by other users and including the private models of your organization. Set `source` to search one of them, or leave it out to search both.

Models discovered through this API can be used immediately in generation tasks **by referencing their AIR identifiers**. This enables dynamic model selection in applications and helps discover new models for specific use cases.

The `search` term matches **model names, descriptions and AIR identifiers**. Filters narrow the results by category, architecture, capabilities and visibility, and they can be combined. Results come back paginated, **20 models per page by default**, controlled by the `limit` and `offset` parameters.

## Request

The Runware API always accepts an array of objects as input, where each object represents a **specific task to be performed**. The structure of the object varies depending on the type of the task. For this section, we will focus on the parameters related to the **model search task**.

The following JSON snippet shows the basic structure of a request object.

**TypeScript**:

```typescript
import { createClient } from '@runware/sdk'

const client = await createClient({ apiKey: process.env.RUNWARE_API_KEY })
await client.connect()

const result = await client.modelSearch({
  search: 'realistic',
  source: 'community',
  category: 'checkpoint',
  architecture: 'sdxl',
  visibility: 'public',
  offset: 0,
  limit: 20
})
```

**Python**:

```python
import asyncio
import os

from runware import Runware

async def main():
    async with Runware(api_key=os.environ["RUNWARE_API_KEY"]) as client:
        result = await client.model_search({
            "search": "realistic",
            "source": "community",
            "category": "checkpoint",
            "architecture": "sdxl",
            "visibility": "public",
            "offset": 0,
            "limit": 20
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
      "taskType": "modelSearch",
      "taskUUID": "50836053-a0ee-4cf5-b9d6-ae7c5d140ada",
      "search": "realistic",
      "source": "community",
      "category": "checkpoint",
      "architecture": "sdxl",
      "visibility": "public",
      "offset": 0,
      "limit": 20
    }
  ]'
```

**CLI**:

```bash
runware model search \
  -q realistic \
  --source community \
  --category checkpoint \
  --architecture sdxl \
  --visibility public \
  --offset 0 \
  --limit 20
```

**JSON**:

```json
{
  "taskType": "modelSearch",
  "taskUUID": "50836053-a0ee-4cf5-b9d6-ae7c5d140ada",
  "search": "realistic",
  "source": "community",
  "category": "checkpoint",
  "architecture": "sdxl",
  "visibility": "public",
  "offset": 0,
  "limit": 20
}
```

---

### [taskType](#request-tasktype)

- **Type**: `string`
- **Required**: true
- **Value**: `modelSearch`

Identifier for the type of task being performed.

### [taskUUID](#request-taskuuid)

- **Type**: `string`
- **Required**: true
- **Format**: `UUID v4`

UUID v4 identifier for tracking tasks and matching async responses. Must be unique per task.

### [search](#request-search)

- **Type**: `string`
- **Min**: `2`
- **Max**: `48`

Search query to find models by name, description or AIR ID.

### [source](#request-source)

- **Type**: `string`

Filter by model source.

**Allowed values**: `official` `community`

### [category](#request-category)

- **Type**: `string`

Filter models by category.

**Allowed values**: `checkpoint` `lora` `lycoris` `vae` `embeddings`

### [architecture](#request-architecture)

- **Type**: `string`

Filter by model architecture.

### [capabilities](#request-capabilities)

- **Type**: `array of strings`

Filter by model capabilities.

### [visibility](#request-visibility)

- **Type**: `string`

Filter by visibility status.

**Allowed values**: `public` `private` `favorite` `owned`

### [limit](#request-limit)

- **Type**: `integer`
- **Min**: `1`
- **Max**: `100`
- **Default**: `20`

Maximum number of results to return.

### [offset](#request-offset)

- **Type**: `integer`
- **Min**: `0`
- **Default**: `0`

Number of results to skip for pagination.

### [sort](#request-sort)

- **Type**: `string`

Sort order for results. A bare field name sorts ascending and a `-` prefix sorts descending, except `popularity`, whose bare value is already descending (most popular first). `_score` sorts by search relevance and has no descending form. Defaults to `_score` when `search` is non-empty, and to `popularity` otherwise.

**Allowed values**: `_score` `popularity` `-popularity` `name` `-name` `addedUnixTimestamp` `-addedUnixTimestamp` `updatedDateUnixTimestamp` `-updatedDateUnixTimestamp`

## Response

Results will be delivered in the format below.

```json
{
  "data": [
    {
      "results": [
        {
          "name": "PhotoRealistic XL",
          "air": "civitai:249421@281440",
          "tags": [
            "character",
            "photorealistic",
            "female",
            "woman",
            "game character",
            "realistic"
          ],
          "heroImage": "https://mim.runware.ai/r/67c740b04a627-800x824.jpg",
          "category": "checkpoint",
          "private": false,
          "version": "PhotoRealistic D XL",
          "architecture": "sdxl",
          "capabilities": [
            "form:checkpoint",
            "io:text-to-image",
            "io:image-to-image"
          ],
          "addedUnixTimestamp": 1705363501,
          "updatedDateUnixTimestamp": 1705363588,
          "source": "community",
          "type": "base",
          "defaultWidth": 1024,
          "defaultHeight": 1024,
          "defaultSteps": 20,
          "defaultScheduler": "Default",
          "defaultCFG": 7.5,
          "defaultStrength": 0.8
        }
      ],
      "taskUUID": "50836053-a0ee-4cf5-b9d6-ae7c5d140ada",
      "taskType": "modelSearch",
      "totalResults": 163
    }
  ]
}
```

---

### [taskType](#response-tasktype)

- **Type**: `string`
- **Required**: true
- **Value**: `modelSearch`

Identifier for the type of task this response belongs to.

### [taskUUID](#response-taskuuid)

- **Type**: `string`
- **Required**: true
- **Format**: `UUID v4`

UUID v4 identifier echoed from the original request, used to match async responses to their tasks.

### [totalResults](#response-totalresults)

- **Type**: `integer`
- **Required**: true
- **Min**: `0`

Total number of models matching the search criteria.

### [results](#response-results)

- **Path**: `results.air`
- **Type**: `array of objects (31 properties)`
- **Required**: true

List of models found.

#### [air](#response-results-air)

- **Path**: `results.air`
- **Type**: `string`
- **Required**: true

Artificial Intelligence Resource identifier.

#### [name](#response-results-name)

- **Path**: `results.name`
- **Type**: `string`
- **Required**: true

Model name.

#### [category](#response-results-category)

- **Path**: `results.category`
- **Type**: `string`
- **Required**: true

Model category.

**Possible values**: `checkpoint` `lora` `lycoris` `vae` `embeddings`

#### [architecture](#response-results-architecture)

- **Path**: `results.architecture`
- **Type**: `string | null`
- **Required**: true

Model architecture.

#### [capabilities](#response-results-capabilities)

- **Path**: `results.capabilities`
- **Type**: `array of strings`
- **Required**: true

Model capabilities.

#### [source](#response-results-source)

- **Path**: `results.source`
- **Type**: `string`
- **Required**: true

Model source.

**Possible values**: `official` `community`

#### [heroImage](#response-results-heroimage)

- **Path**: `results.heroImage`
- **Type**: `string | null`
- **Required**: true
- **Format**: `uri`

Representative image URL.

#### [private](#response-results-private)

- **Path**: `results.private`
- **Type**: `boolean`
- **Required**: true

Whether the model is private.

#### [isFavorite](#response-results-isfavorite)

- **Path**: `results.isFavorite`
- **Type**: `boolean`

Whether the model is favorited.

#### [provider](#response-results-provider)

- **Path**: `results.provider`
- **Type**: `string`

Model provider.

#### [shortDescription](#response-results-shortdescription)

- **Path**: `results.shortDescription`
- **Type**: `string`

Short description.

#### [positiveTriggerWords](#response-results-positivetriggerwords)

- **Path**: `results.positiveTriggerWords`
- **Type**: `string`

Positive trigger words.

#### [negativeTriggerWords](#response-results-negativetriggerwords)

- **Path**: `results.negativeTriggerWords`
- **Type**: `string`

Negative trigger words.

#### [comment](#response-results-comment)

- **Path**: `results.comment`
- **Type**: `string`

Additional comments or notes.

#### [type](#response-results-type)

- **Path**: `results.type`
- **Type**: `string`

Checkpoint type.

**Possible values**: `base` `inpainting` `refiner` `pix2pix`

#### [version](#response-results-version)

- **Path**: `results.version`
- **Type**: `string`

Version of the model.

#### [tags](#response-results-tags)

- **Path**: `results.tags`
- **Type**: `array of strings`

Tags associated with the model.

#### [addedUnixTimestamp](#response-results-addedunixtimestamp)

- **Path**: `results.addedUnixTimestamp`
- **Type**: `integer`
- **Min**: `0`

Unix timestamp of when the model was added.

#### [updatedDateUnixTimestamp](#response-results-updateddateunixtimestamp)

- **Path**: `results.updatedDateUnixTimestamp`
- **Type**: `integer`
- **Min**: `0`

Unix timestamp of when the model was last updated.

#### [floatingPoint](#response-results-floatingpoint)

- **Path**: `results.floatingPoint`
- **Type**: `string`

Floating point precision of the model weights.

#### [uniqueIdentifier](#response-results-uniqueidentifier)

- **Path**: `results.uniqueIdentifier`
- **Type**: `string`

Unique identifier for the model.

#### [defaultWidth](#response-results-defaultwidth)

- **Path**: `results.defaultWidth`
- **Type**: `integer | null`

Default output width.

#### [defaultHeight](#response-results-defaultheight)

- **Path**: `results.defaultHeight`
- **Type**: `integer | null`

Default output height.

#### [defaultSteps](#response-results-defaultsteps)

- **Path**: `results.defaultSteps`
- **Type**: `integer`

Default number of inference steps.

#### [defaultCFG](#response-results-defaultcfg)

- **Path**: `results.defaultCFG`
- **Type**: `float`

Default classifier-free guidance scale.

#### [defaultScheduler](#response-results-defaultscheduler)

- **Path**: `results.defaultScheduler`
- **Type**: `string`

Default scheduler.

#### [defaultStrength](#response-results-defaultstrength)

- **Path**: `results.defaultStrength`
- **Type**: `float`

Default strength for img2img.

#### [defaultWeight](#response-results-defaultweight)

- **Path**: `results.defaultWeight`
- **Type**: `float`

Default weight for the model.

#### [defaultFPS](#response-results-defaultfps)

- **Path**: `results.defaultFPS`
- **Type**: `integer`

Default frames per second.

#### [defaultNumberOfFrames](#response-results-defaultnumberofframes)

- **Path**: `results.defaultNumberOfFrames`
- **Type**: `integer`

Default number of frames.

#### [defaultDuration](#response-results-defaultduration)

- **Path**: `results.defaultDuration`
- **Type**: `float`

Default duration in seconds.