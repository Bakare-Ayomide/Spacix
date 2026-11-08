---
title: Model Router | Runware Docs
url: https://runware.ai/docs/models-api/model-router
description: Let the model router choose the model for a task, guided by your own priorities, price ceiling and requirements.
relatedDocuments:
  - https://runware.ai/docs/models-api/model-search
  - https://runware.ai/docs/models-api/model-schemas
  - https://runware.ai/docs/models-api/errors
---
## Introduction

Sending `"model": "auto"` asks the model router to **choose the model for you**. The rest of the request does not change: the task type says what you want made, the parameters say how, and the model is the only thing left open.

In place of a model you state **what the output has to be**, in `routing`, and the router reads that as **conditions a model has to satisfy**. A model added to the catalog next month can be chosen for the same request, and a model that is retired does not break it. You describe the result once and never name a model again.

The simplest request states nothing at all and takes the best the catalog has for that task.

## Request

Send the task exactly as you otherwise would, with `auto` in place of an AIR identifier.

**TypeScript**:

```typescript
import { createClient } from '@runware/sdk'

const client = await createClient({ apiKey: process.env.RUNWARE_API_KEY })
await client.connect()

const [result] = await client.run<'image'>({
  taskType: 'imageInference',
  model: 'auto',
  positivePrompt: 'a ceramic coffee mug on a marble counter',
  width: 1024,
  height: 1024
})
```

**Python**:

```python
import asyncio
import os

from runware import Runware

async def main():
    async with Runware(api_key=os.environ["RUNWARE_API_KEY"]) as client:
        results = await client.run({
            "taskType": "imageInference",
            "model": "auto",
            "positivePrompt": "a ceramic coffee mug on a marble counter",
            "width": 1024,
            "height": 1024
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
      "taskType": "imageInference",
      "taskUUID": "50836053-a0ee-4cf5-b9d6-ae7c5d140ada",
      "model": "auto",
      "positivePrompt": "a ceramic coffee mug on a marble counter",
      "width": 1024,
      "height": 1024
    }
  ]'
```

**CLI**:

```bash
runware run auto \
  --task-type imageInference \
  positivePrompt="a ceramic coffee mug on a marble counter" \
  width=1024 \
  height=1024
```

**JSON**:

```json
{
  "taskType": "imageInference",
  "taskUUID": "50836053-a0ee-4cf5-b9d6-ae7c5d140ada",
  "model": "auto",
  "positivePrompt": "a ceramic coffee mug on a marble counter",
  "width": 1024,
  "height": 1024
}
```

Everything you send is **kept exactly as you sent it**. The router only fills in what you left out, so a width of 1024 stays 1024 and a prompt is never rewritten. A model that cannot accept one of your values is not chosen.

The response has the shape that task always has, and the task runs as soon as a model is chosen. There is nothing to poll and no second request to make.

### Supported task types

| Task type | Task type |
| --- | --- |
| `imageInference` | `caption` |
| `videoInference` | `upscale` |
| `audioInference` | `removeBackground` |
| `textInference` | `vectorize` |
| `3dInference` | `imageMasking` |
| `promptEnhance` | `controlNetPreprocess` |

The router chooses between the models the catalog has for that task, which is anywhere from one to **well over a hundred**. Where the catalog has only one, the request goes to it.

## The routing object

Any model the router has not ruled out **can serve the request**, so the choice between them is made on **measured evidence**: public benchmark scores, run times and price, weighed together. The optional `routing` object changes how they are weighed and what the result has to be.

**TypeScript**:

```typescript
import { createClient } from '@runware/sdk'

const client = await createClient({ apiKey: process.env.RUNWARE_API_KEY })
await client.connect()

const [result] = await client.run<'video'>({
  taskType: 'videoInference',
  model: 'auto',
  positivePrompt: 'a drone shot over a harbor at sunrise',
  duration: 5,
  routing: {
    preferences: {
      quality: 5,
      speed: 2,
      cost: 1
    },
    maxPrice: 0.4,
    requirements: 'with audio, 1080p or better'
  }
})
```

**Python**:

```python
import asyncio
import os

from runware import Runware

async def main():
    async with Runware(api_key=os.environ["RUNWARE_API_KEY"]) as client:
        results = await client.run({
            "taskType": "videoInference",
            "model": "auto",
            "positivePrompt": "a drone shot over a harbor at sunrise",
            "duration": 5,
            "routing": {
                "preferences": {
                    "quality": 5,
                    "speed": 2,
                    "cost": 1
                },
                "maxPrice": 0.4,
                "requirements": "with audio, 1080p or better"
            }
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
      "taskType": "videoInference",
      "taskUUID": "50836053-a0ee-4cf5-b9d6-ae7c5d140ada",
      "model": "auto",
      "positivePrompt": "a drone shot over a harbor at sunrise",
      "duration": 5,
      "routing": {
        "preferences": {
          "quality": 5,
          "speed": 2,
          "cost": 1
        },
        "maxPrice": 0.4,
        "requirements": "with audio, 1080p or better"
      }
    }
  ]'
```

**CLI**:

```bash
runware run auto \
  --task-type videoInference \
  positivePrompt="a drone shot over a harbor at sunrise" \
  duration=5 \
  routing.preferences.quality=5 \
  routing.preferences.speed=2 \
  routing.preferences.cost=1 \
  routing.maxPrice=0.4 \
  routing.requirements="with audio, 1080p or better"
```

**JSON**:

```json
{
  "taskType": "videoInference",
  "taskUUID": "50836053-a0ee-4cf5-b9d6-ae7c5d140ada",
  "model": "auto",
  "positivePrompt": "a drone shot over a harbor at sunrise",
  "duration": 5,
  "routing": {
    "preferences": {
      "quality": 5,
      "speed": 2,
      "cost": 1
    },
    "maxPrice": 0.4,
    "requirements": "with audio, 1080p or better"
  }
}
```

---

### [allowedModels](#request-allowedmodels)

- **Type**: `array of strings`
- **Min items**: `2`

Models the router may choose from. Nothing outside this list is considered, so a request none of them can serve is refused.

### [excludedModels](#request-excludedmodels)

- **Type**: `array of strings`
- **Min items**: `1`

Models the router may not choose. Every other model stays a candidate.

### [preferences](#request-preferences)

- **Path**: `preferences.quality`
- **Type**: `object (3 properties)`

Relative importance of each dimension when models are compared. Weights, not thresholds.

#### [quality](#request-preferences-quality)

- **Path**: `preferences.quality`
- **Type**: `integer`
- **Min**: `0`
- **Max**: `5`

Importance of one dimension. `0` leaves it out of the decision.

#### [speed](#request-preferences-speed)

- **Path**: `preferences.speed`
- **Type**: `integer`
- **Min**: `0`
- **Max**: `5`

Importance of one dimension. `0` leaves it out of the decision.

#### [cost](#request-preferences-cost)

- **Path**: `preferences.cost`
- **Type**: `integer`
- **Min**: `0`
- **Max**: `5`

Importance of one dimension. `0` leaves it out of the decision.

### [maxPrice](#request-maxprice)

- **Type**: `float`
- **Min**: `0`

Upper bound on what this request may cost, in USD. A model whose cost cannot be bounded is not chosen.

### [requirements](#request-requirements)

- **Type**: `string`
- **Max**: `3000`

Conditions the result has to meet, in plain words, such as a style or a feature. A model that cannot meet them is not chosen. Output size is set with width and height rather than described here.

Leaving `preferences` out weighs the three evenly.

A preference **orders the models that fit**, a requirement **decides which ones fit at all**.

`requirements` describes **the result**, the prompt describes **the subject**, so "with audio, 1080p or better" belongs in one and the scene in the other. When a request carries no prompt, the prompt is written from the requirements too.

### Reading a price ceiling

`maxPrice` is checked against **what the request you sent would cost**. A model billed by the second is costed over the duration you asked for, and one billed per image over the number of results, so the same number means the same thing for every model.

Models often publish several rates for one unit, one per quality tier or resolution. The ceiling is checked against **the highest of them**, because the tier a request lands on is settled when it runs. A model that would have come in under your ceiling on a cheaper tier is turned away. Raise the number and it comes back.

Some models cannot be priced before the run. While `maxPrice` is set those are **never chosen**, because there is no figure to check. Send the request without `maxPrice` to reach them, and weigh `cost` in `preferences` instead.

### Allowed and excluded models

`allowedModels` and `excludedModels` narrow **which models can be chosen at all**, before any weighing happens. Use them when the set you ship from is already fixed, by an approval process or by your own testing.

**TypeScript**:

```typescript
import { createClient } from '@runware/sdk'

const client = await createClient({ apiKey: process.env.RUNWARE_API_KEY })
await client.connect()

const [result] = await client.run<'image'>({
  taskType: 'imageInference',
  model: 'auto',
  positivePrompt: 'a ceramic mug on a linen tablecloth',
  routing: {
    allowedModels: [
      'bfl:2@1',
      'bfl:4@1'
    ],
    preferences: {
      quality: 5,
      cost: 2
    }
  }
})
```

**Python**:

```python
import asyncio
import os

from runware import Runware

async def main():
    async with Runware(api_key=os.environ["RUNWARE_API_KEY"]) as client:
        results = await client.run({
            "taskType": "imageInference",
            "model": "auto",
            "positivePrompt": "a ceramic mug on a linen tablecloth",
            "routing": {
                "allowedModels": [
                    "bfl:2@1",
                    "bfl:4@1"
                ],
                "preferences": {
                    "quality": 5,
                    "cost": 2
                }
            }
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
      "taskType": "imageInference",
      "taskUUID": "198c7f86-8b4f-4ba7-a6b7-5a24f9d8e8f5",
      "model": "auto",
      "positivePrompt": "a ceramic mug on a linen tablecloth",
      "routing": {
        "allowedModels": [
          "bfl:2@1",
          "bfl:4@1"
        ],
        "preferences": {
          "quality": 5,
          "cost": 2
        }
      }
    }
  ]'
```

**CLI**:

```bash
runware run auto \
  --task-type imageInference \
  positivePrompt="a ceramic mug on a linen tablecloth" \
  routing.allowedModels.0=bfl:2@1 \
  routing.allowedModels.1=bfl:4@1 \
  routing.preferences.quality=5 \
  routing.preferences.cost=2
```

**JSON**:

```json
{
  "taskType": "imageInference",
  "taskUUID": "198c7f86-8b4f-4ba7-a6b7-5a24f9d8e8f5",
  "model": "auto",
  "positivePrompt": "a ceramic mug on a linen tablecloth",
  "routing": {
    "allowedModels": [
      "bfl:2@1",
      "bfl:4@1"
    ],
    "preferences": {
      "quality": 5,
      "cost": 2
    }
  }
}
```

The two are **mutually exclusive**, and a request that sends both is rejected.

`allowedModels` takes **at least two names**. With a single allowed model there is nothing to choose between, so send that model as `model` instead.

Each entry is an **AIR identifier or a model slug**, and every name has to be one the catalog publishes. A name that is not is **rejected, with the name quoted in the message**.

Names are matched **case-insensitively**, so `bfl:2@1` and `BFL:2@1` are the same model and a list holding both is rejected as a repeat.

## When nothing is chosen

When the router cannot choose, it **returns an error rather than guessing**. Every error names what stopped it, so you can correct the request without reading the catalog.

### [modelRouterUnsupportedTaskType](#error-modelrouterunsupportedtasktype)

Routing is not available for that task type. The message names the current task type when the one you sent has been superseded.

### [noEligibleModel](#error-noeligiblemodel)

No model can serve the request as sent. The `reason` names what ruled the rest out, such as a parameter no model of that kind accepts, a value outside every model's range, or a price ceiling nothing meets.

### [modelRouterNeedsDescription](#error-modelrouterneedsdescription)

The request carries media but nothing that says what to make, and the chosen model cannot run without it. Describe the result in `routing.requirements`, or send the parameter the message names.

### [invalidParameter](#error-invalidparameter)

A parameter no model declares, or an unknown key inside `routing`. The message names the parameter, and a near miss such as `inputs.strength` for `strength` is named with it.

### [modelRouterInvalidModelList](#error-modelrouterinvalidmodellist)

`routing.allowedModels` or `routing.excludedModels` is not an array of distinct model identifiers. An empty array is rejected, and so is the same model named twice in any spelling.

### [modelRouterTooFewAllowedModels](#error-modelroutertoofewallowedmodels)

`routing.allowedModels` holds fewer than two names. Add another, or send the model you want as `model`.

### [modelRouterConflictingModelLists](#error-modelrouterconflictingmodellists)

Both `routing.allowedModels` and `routing.excludedModels` were sent. Keep the one that states the set you want.

### [modelRouterUnknownModel](#error-modelrouterunknownmodel)

A name in `routing.allowedModels` or `routing.excludedModels` is not a model the catalog publishes. The message quotes the name and says which list it came from.

### [modelRouterUnavailable](#error-modelrouterunavailable)

retryable

Routing is temporarily unavailable. Retry, or send the request with a specific model.

> [!NOTE]
> The router only chooses from the official models, the ones in the [model catalog](https://runware.ai/docs/models). Community models and your organization's private models are never chosen, and stay available by naming their AIR identifier.