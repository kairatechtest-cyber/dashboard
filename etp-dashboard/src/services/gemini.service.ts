import { inject, Injectable } from '@angular/core';
import { GoogleGenAI } from '@google/genai';
import { DashboardDataService } from './dashboard-data.service';

@Injectable({
  providedIn: 'root',
})
export class GeminiService {
  private ai: GoogleGenAI;
  private dataService = inject(DashboardDataService);

  constructor() {
    // IMPORTANT: In a real app, you would use a secure way to handle API keys.
    // For this applet, we are assuming process.env.API_KEY is available.
    if (!process.env.API_KEY) {
      console.error('API_KEY environment variable not set.');
      // Fallback for when the key is not available, to prevent app crash.
      this.ai = null!;
    } else {
      this.ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    }
  }

  async generateInsights(): Promise<string> {
    if (!this.ai) {
      return Promise.reject('Gemini AI client is not initialized. Check API_KEY.');
    }

    // Gather all necessary data from the dashboard data service
    const dashboardData = {
      kpis: this.dataService.kpiData(),
      influent: this.dataService.influentSubKpis(),
      effluent: this.dataService.effluentSubKpis(),
      pumpStatus: this.dataService.pumpStatus(),
      acidDosing: this.dataService.acidDosingParams(),
    };

    const prompt = `
      You are an expert analyst for an Effluent Treatment Plant (ETP).
      Your task is to provide a brief, low-latency summary of the plant's current status based on the following real-time data.
      Highlight any metrics that seem unusual or require immediate attention.
      Be concise and professional. Use bullet points for key observations.

      Current ETP Data:
      ${JSON.stringify(dashboardData, null, 2)}
    `;

    try {
      const response = await this.ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          // Disable thinking for low-latency responses as requested
          thinkingConfig: { thinkingBudget: 0 },
        },
      });
      return response.text;
    } catch (error) {
      console.error('Error generating insights:', error);
      throw new Error('Failed to generate AI insights. Please check the connection or API key.');
    }
  }
}
