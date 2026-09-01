exports.handler = async function (event) {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: "Method not allowed" })
    };
  }

  try {
    const { products } = JSON.parse(event.body || "{}");

    if (!Array.isArray(products)) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "products must be an array" })
      };
    }

    const token = process.env.GITHUB_TOKEN;

    if (!token) {
      return {
        statusCode: 500,
        body: JSON.stringify({
          error: "GITHUB_TOKEN is not configured"
        })
      };
    }

    const owner = "ittzsarias-brand";
    const repo = "KurdShein";
    const path = "products.json";
    const branch = "main";

    const apiUrl =
      `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;

    const headers = {
      "Authorization": `Bearer ${token}`,
      "Accept": "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28"
    };

    // Get the current file SHA
    const currentResponse = await fetch(
      `${apiUrl}?ref=${branch}`,
      { headers }
    );

    if (!currentResponse.ok) {
      const errorText = await currentResponse.text();

      return {
        statusCode: currentResponse.status,
        body: JSON.stringify({
          error: "Could not read products.json from GitHub",
          details: errorText
        })
      };
    }

    const currentFile = await currentResponse.json();

    // Create the same structure used by your products.json
    const fileContent = JSON.stringify(
      {
        version: 1,
        updatedAt: new Date().toISOString(),
        products: products
      },
      null,
      2
    );

    const encodedContent = Buffer
      .from(fileContent, "utf8")
      .toString("base64");

    const updateResponse = await fetch(apiUrl, {
      method: "PUT",
      headers: {
        ...headers,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        message: "Update products.json from admin panel",
        content: encodedContent,
        sha: currentFile.sha,
        branch: branch
      })
    });

    const result = await updateResponse.json();

    if (!updateResponse.ok) {
      return {
        statusCode: updateResponse.status,
        body: JSON.stringify({
          error: "GitHub update failed",
          details: result
        })
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        message: "Products updated successfully",
        commit: result.commit?.sha || null
      })
    };

  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: error.message
      })
    };
  }
};
