import { generateEmbedding, cosineSimilarity, Place } from './aiService';

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

    console.log('Initializing vector store with embeddings...');
    
    // Generate embeddings for all places
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
   * Search for similar places using vector similarity
   */
  async search(
    queryText: string,
    options: {
      limit?: number;
      mood?: string;
      city?: string;
      minSimilarity?: number;
    } = {}
  ): Promise<Place[]> {
    const { limit = 10, mood, city, minSimilarity = 0.3 } = options;

    try {
      // Generate embedding for query
      const queryEmbedding = await generateEmbedding(queryText);

      // Calculate similarity scores
      const results: Array<{ place: Place; similarity: number }> = [];

      for (const entry of this.store.values()) {
        // Apply filters
        if (mood && entry.metadata.mood !== mood && entry.metadata.mood !== 'general') {
          continue;
        }
        if (city && entry.metadata.city.toLowerCase() !== city.toLowerCase()) {
          continue;
        }

        // Calculate similarity
        const similarity = cosineSimilarity(queryEmbedding, entry.embedding);

        if (similarity >= minSimilarity) {
          results.push({ place: entry.place, similarity });
        }
      }

      // Sort by similarity and return top results
      return results
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, limit)
        .map((r) => r.place);
    } catch (error) {
      console.error('Error in vector search:', error);
      return [];
    }
  }

  /**
   * Add a new place to the vector store
   */
  async addPlace(place: Place, mood?: string): Promise<void> {
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
      console.error(`Error adding place ${place.id} to vector store:`, error);
    }
  }

  /**
   * Get all places from the store
   */
  getAllPlaces(): Place[] {
    return Array.from(this.store.values()).map((entry) => entry.place);
  }

  /**
   * Clear the vector store
   */
  clear(): void {
    this.store.clear();
    this.initialized = false;
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

// Export singleton instance
export const vectorStore = new VectorStore();
