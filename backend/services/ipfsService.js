import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();
const PINATA_API_KEY = process.env.PINATA_API_KEY;
const PINATA_API_SECRET = process.env.PINATA_API_SECRET;

export const uploadToIPFS = async (content) => {
    try {
        // Make sure content is a JSON object or parseable
        const jsonData = typeof content === 'string' ? JSON.parse(content) : content;

        const response = await axios.post(
            'https://api.pinata.cloud/pinning/pinJSONToIPFS',
            jsonData,
            {
                headers: {
                    pinata_api_key: PINATA_API_KEY,
                    pinata_secret_api_key: PINATA_API_SECRET,
                    'Content-Type': 'application/json',
                },
            }
        );

        // Pinata response contains the CID in IpfsHash property
        return response.data.IpfsHash;
    } catch (error) {
        console.error('Pinata IPFS upload failed:', error.response?.data || error.message);
        throw new Error('Failed to upload to IPFS via Pinata');
    }
};
