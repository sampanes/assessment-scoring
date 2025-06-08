# 📋 Survey JSON Schema

This repository contains JSON-based surveys that are loaded dynamically on a static site. Below is the schema used for these files.

---

## 🔖 Top-Level Fields

| Key         | Type     | Description                                        |
|-------------|----------|----------------------------------------------------|
| `name`      | string   | The title of the survey                            |
| `questions` | array    | List of questions with numbers, text, and options  |
| `scoring`   | object   | Instructions for calculating results               |

---

## 🧠 `questions[]` Structure

Each question object contains:

| Key       | Type     | Description                           |
|-----------|----------|---------------------------------------|
| `number`  | integer  | The question's number (1-based index) |
| `text`    | string   | The question prompt                   |
| `options` | array    | List of visible answer choices        |

> ✅ The **index** of the selected option is used to look up its actual numeric value using `scoring.methods[].values`.

---

## 🧮 `scoring.methods[]`

Each object in the `scoring.methods` array defines how to calculate a particular score or result.

| Key         | Type      | Required | Description                                                                 |
|--------------|-----------|----------|-----------------------------------------------------------------------------|
| `name`       | string    | ✅        | Identifier for the scoring result                                           |
| `type`       | string    | ✅        | One of: `sum`, `average`, `countAbove`, `criteria`                         |
| `questions`  | array     | optional | Question numbers to include in the scoring                                 |
| `values`     | array     | optional | Maps each selected option index to a numeric value                         |
| `threshold`  | number    | optional | Minimum value to trigger count (used in `countAbove`)                      |
| `require`    | array     | required for `criteria` | Logical subrules (see below)                                   |

---

## 🔍 `criteria.require[]`

Used when a scoring method's `type` is `"criteria"`. These rules define whether a specific condition is met.

Each rule has:

- `type`: `"countInRange"` or `"anyInRange"`
- `questions`: array of question numbers to check
- `range`: `[minValue, maxValue]`
- `minCount`: *(only required for `countInRange`)*

### Rule Types

- `countInRange`: Must have at least `minCount` answers within the `range`.
- `anyInRange`: At least one answer falls within the `range`.

---

## ✅ Example

```json
{
  "name": "Example Survey",
  "questions": [
    {
      "number": 1,
      "text": "I feel down or hopeless.",
      "options": ["Never", "Sometimes", "Often", "Always"]
    }
  ],
  "scoring": {
    "methods": [
      {
        "name": "total",
        "type": "sum",
        "questions": [1],
        "values": [0, 1, 2, 3]
      },
      {
        "name": "symptom-check",
        "type": "criteria",
        "require": [
          {
            "type": "countInRange",
            "questions": [1, 2, 3],
            "range": [2, 3],
            "minCount": 2
          }
        ]
      }
    ]
  }
}
```

---

## 💡 Tips

- You can skip the `questions` key in `scoring.methods[]` to apply the method to all questions by default.
- Keep `values` consistent with how your answers are meant to be scored.
- Add a `label` (optional) to any scoring method if you want a custom display name in the results UI.
