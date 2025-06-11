// netlify/functions/uploadImage.mjs

import { Octokit } from '@octokit/rest';
import { Buffer } from 'buffer'; // <--- IMPORTANT: Add this import

export const handler = async (event) => {
    // Ensure only POST requests are allowed
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    // Retrieve environment variables
    const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
    const OWNER = process.env.GITHUB_REPO_OWNER; // <--- Corrected variable name
    const REPO = process.env.GITHUB_REPO_NAME;   // <--- Corrected variable name
    const IMAGES_DIR = process.env.IMAGES_DIR || 'assets/tips-images'; // <--- Use an environment variable for path

    // Validate essential environment variables
    if (!GITHUB_TOKEN || !OWNER || !REPO || !IMAGES_DIR) {
        console.error('Missing GitHub/Image environment variables for uploadImage!');
        return {
            statusCode: 500,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: 'Missing image upload configuration. Please check Netlify environment variables.' }),
        };
    }

    const octokit = new Octokit({ auth: GITHUB_TOKEN }); // Initialize Octokit with the token

    try {
        const { fileBase64, fileName } = JSON.parse(event.body); // Parse the request body
        if (!fileBase64 || !fileName) {
            console.error('Missing fileBase64 or fileName in request body.');
            return {
                statusCode: 400,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: 'Missing image data (base64 or file name).' }),
            };
        }

        // Create a unique file path within the specified directory
        // Using Date.now() ensures uniqueness for new uploads
        const filePath = `${IMAGES_DIR}/${Date.now()}-${fileName}`;
        let sha = null; // SHA of the existing file (if applicable)

        // It's good practice to check if the file exists, though less critical with Date.now()
        // If you were *updating* files with static names, this check would be essential.
        try {
            const { data } = await octokit.repos.getContent({
                owner: OWNER,
                repo: REPO,
                path: filePath,
            });
            sha = data.sha; // Get the SHA if the file exists (for updating)
        } catch (error) {
            if (error.status === 404) {
                // File not found, which is expected for a new upload
                console.log(`Image file not found at ${filePath}, proceeding with creation.`);
            } else {
                // Re-throw any other errors during getContent
                console.error('Error checking existing image file:', error);
                throw error;
            }
        }

        // Create or update the file on GitHub
        const { data } = await octokit.repos.createOrUpdateFileContents({
            owner: OWNER,
            repo: REPO,
            path: filePath,
            message: `Upload image: ${fileName}`, // Commit message
            content: fileBase64, // The content is already Base64 from the frontend
            sha: sha, // SHA is required for updates (will be null for new files)
            branch: 'main', // Ensure this matches your default branch
            committer: { // Add committer details for better commit history
                name: "Netlify Bot",
                email: "bot@netlify.com"
            }
        });

        // Construct the public URL for the uploaded image
        // Using raw.githubusercontent.com for direct file access
        const imageUrl = `https://raw.githubusercontent.com/${OWNER}/${REPO}/main/${filePath}`;

        return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: imageUrl, message: 'Image uploaded successfully to GitHub!' }),
        };

    } catch (error) {
        console.error('Error in uploadImage function:', error);
        return {
            statusCode: 500,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: `Internal server error during image upload: ${error.message}` }),
        };
    }
};
