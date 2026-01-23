import { generateEmbedding, Place } from './aiService';

/**
 * Simple in-memory vector store for place embeddings
 * In production, this would be replaced with a proper vector database (Pinecone, Weaviate, etc.)
 */
interface VectorStoreEntry {
  place: Place;
  embedding: number[];
  metadata: {
    mood: string;
    type: string;
    city: string;
  };
}

class VectorStore {
  private store: Map<number, VectorStoreEntry> = new Map();
  private initialized: boolean = false;

  /**
   * Initialize the vector store with places
   */
  async initialize(places: Place[], mood?: string): Promise<void> {
    if (this.initialized) {
      return;
    }

    // Embeddings require OpenAI (Groq doesn't provide embeddings API)
    if (!process.env.OPENAI_API_KEY) {
      console.log('Skipping vector store initialization - OpenAI API key not configured (required for embeddings)');
      this.initialized = true;
      return;
    }

    console.log('Initializing vector store with embeddings...');
    
    for (const place of places) {
      try {
        const placeText = `${place.name} ${place.type} ${place.description} ${place.amenities.join(' ')}`;
        const embedding = await generateEmbedding(placeText);
        
        this.store.set(place.id, {
          place,
          embedding,
          metadata: {
            mood: mood || 'general',
            type: place.type,
            city: place.city,
          },
        });
      } catch (error) {
        console.error(`Error generating embedding for place ${place.id}:`, error);
      }
    }

    this.initialized = true;
    console.log(`Vector store initialized with ${this.store.size} places`);
  }

  /**
   * Get store statistics
   */
  getStats() {
    return {
      size: this.store.size,
      initialized: this.initialized,
    };
  }
}

export const vectorStore = new VectorStore();
