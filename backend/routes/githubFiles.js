import { Router } from 'express';
import axios from 'axios';
const router = Router();

router.get('/files/:projectName', async (req, res) => {
  try {
    const { projectName } = req.params;
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'Missing token' });
    }
    const accessToken = authHeader.split(' ')[1];
    const match = projectName.match(/github\.com\/([^/]+)\/([^/]+)/);
    if (!match) {
      return res.status(400).json({ error: "Invalid GitHub repository URL" });
    }
    const owner = match[1];
    const repo = match[2];
    const repoInfoUrl = `https://api.github.com/repos/${owner}/${repo}`;
    const repoInfo = await axios.get(repoInfoUrl, {
      headers: { Authorization: `token ${accessToken}` }
    });

    const branch = repoInfo.data.default_branch;
    const githubApiUrl = `https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`;
    const githubResponse = await axios.get(githubApiUrl, {
      headers: {
        Authorization: `token ${accessToken}`,
        Accept: "application/vnd.github.v3+json"
      }
    });
    res.json({
      status: "approved",
      data: githubResponse.data
    });
  } catch (error) {
    if (error.response?.status === 403) {
      console.warn("Access forbidden for:", projectName);
      return res.status(403).json({
        status: "pending",
      
        requestAction: "reauthenticate",
        repoUrl: projectName
      });
    }
    console.error("Error fetching folder structure:", error.message);
    res.status(500).json({
      status: "error",
      error: "Unable to fetch repository structure"
    });
  }
});

export default router;
