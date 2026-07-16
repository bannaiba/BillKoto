import express from 'express';
import cors from 'cors';
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Serve static files from the React build
app.use(express.static(path.join(__dirname, '../dist')));

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

const RECEIPT_PROMPT = `You are a receipt parser. Analyze this receipt image and extract ALL food/drink items with their prices into structured JSON.

RULES:
1. Extract EVERY individual line item from the receipt
2. "price" must be the TOTAL price for that line (quantity × unit price)
3. If quantity is not shown, assume 1
4. Identify VAT/tax percentage and amount separately
5. Identify service charge percentage and amount separately
6. Identify any discount percentage and amount separately
7. Determine if the receipt prices are "inclusive" of VAT/service charge (e.g. sum of item prices exactly matches the total amount) or "exclusive" (sum of item prices + vat + service = total). Set isInclusive to true or false.
8. All numbers must be plain numbers (no currency symbols)
9. Return ONLY valid JSON — no markdown, no code fences, no explanation text

COMBO / SET MEAL HANDLING (CRITICAL):
Receipts often contain combo/set/bowl meals where a parent item is followed by sub-component rows that have NO price column at all. You MUST handle this correctly:

- A sub-component row has NO numbers in the price columns. Its cost is already included in the parent item's price.
- Prefixes like "1*1", "*1", "1x1" before a name with NO price indicate a combo sub-component, NOT a separate item.
- MERGE all consecutive zero-price / no-price rows into the preceding priced item by appending the names in parentheses.
- NEVER output an item with price = 0. Every item in the output MUST have price > 0.

Examples of what to merge:
  Receipt shows:
    1 Thai Chicken Bowl   538.10 538.10
    1*1 Chicken in Black Paper
  Output: { "name": "Thai Chicken Bowl (Chicken in Black Paper)", "quantity": 1, "price": 538.10 }

  Receipt shows:
    1 Coleslaw And Drinks Combo   132.38 132.38
    1*1 Chocolate Crusher
    1*1 Fries
  Output: { "name": "Coleslaw And Drinks Combo (Chocolate Crusher, Fries)", "quantity": 1, "price": 132.38 }

Required JSON format:
{
  "restaurantName": "string or null",
  "items": [
    { "name": "Item Name", "quantity": 1, "price": 123.00 }
  ],
  "subtotal": 0,
  "discount": { "percentage": 0, "amount": 0 },
  "vat": { "percentage": 0, "amount": 0 },
  "serviceCharge": { "percentage": 0, "amount": 0 },
  "isInclusive": false,
  "total": 0,
  "currency": "string or null"
}

If you cannot determine a value, use 0 for numbers and null for strings.`;

app.post('/api/parse-receipt', async (req, res) => {
  try {
    const { image, mimeType } = req.body;

    if (!image) {
      return res.status(400).json({ error: 'No image provided' });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ error: 'Server API key not configured. Please set GEMINI_API_KEY in .env file.' });
    }

    // Try models in order of preference until one works
    const MODEL_FALLBACK_ORDER = [
      'gemini-3-flash',
      'gemini-2.5-flash',
      'gemini-2.5-flash-lite',
      'gemini-2.0-flash',
      'gemini-2.0-flash-lite',
    ];

    let result;
    let lastError;
    for (const modelName of MODEL_FALLBACK_ORDER) {
      try {
        const model = genAI.getGenerativeModel({ model: modelName });
        result = await model.generateContent([
          RECEIPT_PROMPT,
          {
            inlineData: {
              data: image,
              mimeType: mimeType || 'image/jpeg',
            },
          },
        ]);
        console.log(`Receipt parsed successfully with model: ${modelName}`);
        break;
      } catch (err) {
        console.warn(`Model ${modelName} failed (${err.status || err.message?.slice(0,40)}), trying next...`);
        lastError = err;
      }
    }

    if (!result) {
      throw lastError || new Error('All models failed');
    }

    const text = result.response.text();

    // Extract JSON from response (handle possible markdown wrapping)
    let jsonStr = text;
    const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fenceMatch) {
      jsonStr = fenceMatch[1].trim();
    } else {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        jsonStr = jsonMatch[0];
      }
    }

    const receiptData = JSON.parse(jsonStr);

    // Post-process: merge any zero-price items into the preceding item
    if (Array.isArray(receiptData.items)) {
      const merged = [];
      for (const item of receiptData.items) {
        const price = Number(item.price) || 0;
        if (price <= 0 && merged.length > 0) {
          // This is a combo sub-component — merge into previous item
          const parent = merged[merged.length - 1];
          const subName = (item.name || '').replace(/^\d+\*\d+\s*/, '').trim();
          if (subName) {
            if (parent.name.includes('(')) {
              // Already has sub-components, append
              parent.name = parent.name.replace(/\)$/, `, ${subName})`);
            } else {
              parent.name = `${parent.name} (${subName})`;
            }
          }
        } else {
          merged.push({ ...item });
        }
      }
      receiptData.items = merged;
    }

    res.json(receiptData);
  } catch (error) {
    console.error('Error parsing receipt:', error.message);
    res.status(500).json({
      error: 'Failed to parse receipt. Please try again or enter items manually.',
    });
  }
});

// Catch-all for SPA routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});

app.listen(PORT, () => {
  console.log(`FairSplit server running on http://localhost:${PORT}`);
});
