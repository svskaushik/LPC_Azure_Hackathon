import { BlobServiceClient, ContainerClient } from '@azure/storage-blob';

/**
 * Azure Blob Storage utility functions
 */

// Get the blob service client from the SAS URL
const getBlobServiceClient = (): BlobServiceClient | null => {
  const sasUrl = process.env.BLOB_SAS_URL;
  
  if (!sasUrl) {
    console.error('Missing Blob Storage SAS URL configuration');
    return null;
  }
  
  return new BlobServiceClient(sasUrl);
};

// Get container client from blob service client
const getContainerClient = (): ContainerClient | null => {
  const blobServiceClient = getBlobServiceClient();
  if (!blobServiceClient) return null;
  
  // The container name is part of the SAS URL
  const url = new URL(process.env.BLOB_SAS_URL || '');
  const containerName = url.pathname.split('/')[1]; // Extract container name from path
  
  if (!containerName) {
    console.error('Container name not found in SAS URL');
    return null;
  }
  
  return blobServiceClient.getContainerClient(containerName);
};

/**
 * Upload file to Azure Blob Storage
 * @param file File to upload
 * @param fileName Custom filename (optional, defaults to original file name)
 * @returns URL of the uploaded blob or null if upload failed
 */
export const uploadToBlob = async (file: File, fileName?: string): Promise<string | null> => {
  try {
    const containerClient = getContainerClient();
    if (!containerClient) return null;
    
    // Use provided filename or generate a unique one based on timestamp and file name
    const blobName = fileName || `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);
    
    // Read file as array buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // Upload to Azure Blob Storage
    await blockBlobClient.upload(buffer, buffer.length);
    
    // Return the URL of the uploaded blob
    return blockBlobClient.url;
  } catch (error) {
    console.error('Error uploading file to blob storage:', error);
    return null;
  }
};

/**
 * Delete blob from Azure Blob Storage
 * @param blobUrl The URL of the blob to delete
 * @returns True if deletion was successful, false otherwise
 */
export const deleteFromBlob = async (blobUrl: string): Promise<boolean> => {
  try {
    // Extract blob name from the URL
    const url = new URL(blobUrl);
    const blobName = url.pathname.split('/').pop();
    
    if (!blobName) {
      console.error('Could not extract blob name from URL:', blobUrl);
      return false;
    }
    
    const containerClient = getContainerClient();
    if (!containerClient) return false;
    
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);
    await blockBlobClient.delete();
    
    return true;
  } catch (error) {
    console.error('Error deleting blob:', error);
    return false;
  }
};
