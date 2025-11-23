# Crontal - RFQ Automation

A React-based RFQ (Request for Quotation) automation platform powered by the Gemini API.

**This is a serverless application.** It uses the Gemini API directly from the browser. Data sharing (Buyer -> Supplier) is handled by encoding data into the URL, so no backend database is required for the core flow.

## 🚀 Quick Start

### 1. Prerequisites
- Node.js (v18 or higher)
- A Google AI Studio API Key

### 2. Setup API Key
1. Visit [Google AI Studio](https://aistudiocdn.com/apikey) to get your free API key.
2. Create a file named `.env` in the root directory.
3. Add your key:
   ```env
   API_KEY=AAIzaSyCPjQV3Ncfln-uhzV7XmuPAJ0VxMLXYXpQ
   ```

### 3. Install & Run
```bash
# Install dependencies
npm install

# Run development server
npm run dev
```

## 📦 Pushing to GitHub

1. **Important:** Ensure you have the `.gitignore` file created in this directory. This prevents your API Key and massive dependency folders from being uploaded.
2. Run the following commands in your terminal:

```bash
git init
git add .
git commit -m "Initial commit"
# Create a new repo on GitHub.com and copy the URL
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
git push -u origin main
```

## 🌐 How to Deploy (Live)

The simplest way to deploy this app for actual users is via **Vercel** or **Netlify**.

### Option 1: Vercel (Recommended)
1. Push this code to a GitHub repository (see above).
2. Go to [Vercel](https://vercel.com) and click **"Add New Project"**.
3. Import your GitHub repository.
4. In the **"Environment Variables"** section, add:
   - Key: `API_KEY`
   - Value: `Your_Google_AI_Studio_Key`
5. Click **Deploy**.

### Option 2: Netlify (Drag & Drop)
1. Run `npm run build` in your terminal. This creates a `dist` folder.
2. Go to [Netlify Drop](https://app.netlify.com/drop).
3. Drag and drop the `dist` folder onto the page.
4. **Important**: Since this is a client-side build, the API key from your local `.env` file will be bundled into the code. This is fine for demos, but for high-security production apps, you should restrict your API key in the Google Cloud Console to only allow requests from your Netlify domain.