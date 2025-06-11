import { CosmosClient, Database, Container } from "@azure/cosmos";

// Define the interfaces for our data models
export interface GradingRecord {
  id?: string;
  blkNumber: string;
  imageUrl: string;
  imageSize: string;
  aiGrades: {
    smoothness: number;
    shininess: number;
    confidence: number;
  };
  processingTime: number;
  technicianEmail: string;
  station?: string;
  batchInfo?: string;
}

export interface TechnicianGrades {
  blkNumber: string;
  smoothness: number;
  shininess: number;
}

export class PotatoGradingDatabase {
  private client: CosmosClient;
  private database: Database;
  private container: Container;

  constructor() {
    this.client = new CosmosClient({
      endpoint: process.env.AZURE_COSMOS_DB_ENDPOINT!,
      key: process.env.AZURE_COSMOS_DB_KEY!,
    });
    
    this.database = this.client.database(process.env.COSMOSDB_DATABASE_NAME!);
    this.container = this.database.container(process.env.COSMOSDB_CONTAINER_NAME!);
  }

  async createGradingRecord(data: GradingRecord): Promise<any> {
    try {
      const document = {
        id: `grade-${data.blkNumber}-${Date.now()}`,
        blkNumber: data.blkNumber,
        documentType: "grading_result",
        imageMetadata: {
          originalImageUrl: data.imageUrl,
          imageSize: data.imageSize || "unknown",
          captureDateTime: new Date().toISOString(),
        },
        gradingResults: {
          smoothnessGrade: data.aiGrades.smoothness,
          shininessGrade: data.aiGrades.shininess,
          combinedGrade: data.aiGrades.smoothness + data.aiGrades.shininess,
          confidenceScore: data.aiGrades.confidence,
          modelVersion: "gpt-4-vision-preview",
          processingTime: data.processingTime,
        },
        qualityControl: {
          qcTechnician: data.technicianEmail,
          station: data.station || "unknown",
          batchInfo: data.batchInfo || `Batch-${new Date().toISOString().split('T')[0]}`,
          reviewStatus: "pending",
          technicianSmoothnessGrade: null,
          technicianShininessGrade: null,
          technicianCombinedGrade: null,
        },
        timestamps: {
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      };

      const { resource } = await this.container.items.create(document);
      return resource;
    } catch (error) {
      console.error("Error creating grading record:", error);
      throw error;
    }
  }

  async updateTechnicianGrades(documentId: string, technicianGrades: TechnicianGrades): Promise<any> {
    try {
      const { resource } = await this.container.item(documentId, technicianGrades.blkNumber).read();
      
      if (resource) {
        resource.qualityControl.technicianSmoothnessGrade = technicianGrades.smoothness;
        resource.qualityControl.technicianShininessGrade = technicianGrades.shininess;
        resource.qualityControl.technicianCombinedGrade = 
          technicianGrades.smoothness + technicianGrades.shininess;
        resource.qualityControl.reviewStatus = "completed";
        resource.timestamps.updatedAt = new Date().toISOString();

        const { resource: updated } = await this.container
          .item(documentId, technicianGrades.blkNumber)
          .replace(resource);
        
        return updated;
      }
      
      throw new Error("Document not found");
    } catch (error) {
      console.error("Error updating technician grades:", error);
      throw error;
    }
  }

  async getGradingHistory(blkNumber: string): Promise<any[]> {
    try {
      const querySpec = {
        query: "SELECT * FROM c WHERE c.blkNumber = @blkNumber ORDER BY c.timestamps.createdAt DESC",
        parameters: [{ name: "@blkNumber", value: blkNumber }]
      };
      
      const { resources } = await this.container.items.query(querySpec).fetchAll();
      return resources;
    } catch (error) {
      console.error("Error getting grading history:", error);
      throw error;
    }
  }
  
  async getLatestGrades(limit: number = 10): Promise<any[]> {
    try {
      const querySpec = {
        query: "SELECT * FROM c WHERE c.documentType = 'grading_result' ORDER BY c.timestamps.createdAt DESC OFFSET 0 LIMIT @limit",
        parameters: [{ name: "@limit", value: limit }]
      };
      
      const { resources } = await this.container.items.query(querySpec).fetchAll();
      return resources;
    } catch (error) {
      console.error("Error getting latest grades:", error);
      throw error;
    }
  }

  async deleteGradingRecord(documentId: string, blkNumber: string): Promise<void> {
    try {
      await this.container.item(documentId, blkNumber).delete();
    } catch (error) {
      console.error("Error deleting grading record:", error);
      throw error;
    }
  }
}
