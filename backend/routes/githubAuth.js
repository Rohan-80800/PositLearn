import { Router } from "express";
import axios from "axios";

const CLIENT_URL = process.env.CLIENT_URL;
const router = Router();
const CLIENT_ID = process.env.GITHUB_CLIENT_ID;
const CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;
const SERVER_URL = process.env.SERVER_URL;
const SCOPE = "repo";

router.get("/", (req, res) => {
  const state = req.query.state || Math.random().toString(36).substring(7);

  const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${CLIENT_ID}&redirect_uri=${SERVER_URL}/auth/github/callback&scope=${SCOPE}&state=${encodeURIComponent(
    state
  )}`;
  res.redirect(githubAuthUrl);
});

router.get("/callback", async (req, res) => {
  const { code, state, error, error_description } = req.query;

  if (error) {
    console.error("Callback error:", { error, error_description });
    return res.redirect(
      `${CLIENT_URL}/auth/github/callback?error=${error}&error_description=${error_description}&state=${encodeURIComponent(
        state
      )}`
    );
  }

  if (!code) {
    return res.status(400).send("Code not provided");
  }

  try {
    const tokenResponse = await axios.post(
      "https://github.com/login/oauth/access_token",
      {
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        code,
        redirect_uri: `${CLIENT_URL}/auth/github/callback`,
      },
      { headers: { Accept: "application/json" } }
    );

    const { access_token, error: tokenError } = tokenResponse.data;

    if (tokenError) {
      console.error("Token error:", tokenError);
      return res.redirect(
        `${CLIENT_URL}/auth/github/callback?error=${tokenError}&state=${encodeURIComponent(
          state
        )}`
      );
    }

    res.redirect(
      `${CLIENT_URL}/auth/github/callback?githubToken=${access_token}&state=${encodeURIComponent(
        state
      )}`
    );
  } catch (error) {
    console.error("GitHub OAuth callback error:", error);
    res.status(500).send("Authentication failed");
  }
});

export default router;
