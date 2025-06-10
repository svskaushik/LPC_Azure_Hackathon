# SkinFinish: Potato Quality Grading System

## About The Project

SkinFinish is a proof-of-concept web application developed for The Little Potato Company that leverages Azure OpenAI vision capabilities to automatically grade potatoes based on skin finish quality. This tool helps standardize and automate the quality assessment process for potato inspection.

## Features

- **Single Page Image Upload Interface**: Simple UI for uploading potato images
- **Real-time AI Grading**: Immediate potato quality assessment using Azure OpenAI GPT-4 Vision
- **Multi-factor Grading**: Evaluates potatoes across metrics of shininess and smoothness
- **Responsive Design**: Works on both desktop and mobile devices

## Technology Stack

- **Frontend**: Next.js 14+ with App Router
- **Language**: TypeScript for type safety
- **Styling**: Tailwind CSS for responsive design
- **AI Integration**: Azure OpenAI SDK with Vision capabilities
- **Hosting**: Azure AI Foundry services

## How It Works

1. Users upload images of potatoes through the web interface
2. Images are processed and sent to Azure OpenAI Vision API via a secure endpoint
3. Our custom potato grading system prompt instructs the AI to:
   - Grade potatoes on shininess (scale 1-5)
   - Grade potatoes on smoothness (scale 1-5)
   - Provide a combined score (sum of both metrics)
   - Focus only on whole potatoes (ignoring cut specimens)
4. Results are displayed in a formatted, easy-to-read report

## Getting Started

### Prerequisites

- Node.js 18+ and npm/pnpm
- Azure OpenAI API access

### Environment Setup

Create a `.env.local` file and configure:

```
AZURE_OPENAI_RESOURCE_NAME=your-resource-endpoint
AZURE_OPENAI_API_KEY=your-api-key
AZURE_OPENAI_DEPLOYMENT_NAME=gpt-4.1
```

### Installation

```powershell
# Install dependencies
pnpm install

# Run development server
pnpm dev
```

## Future Development

- Integration with automated sorting systems
- Historical grading data analysis
- Batch processing capabilities
- Training on different potato varieties

---

Developed for The Little Potato Company using Azure AI Foundry services.