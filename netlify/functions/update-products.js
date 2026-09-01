exports.handler = async function (event) {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Method not allowed" })
    };
  }

  try {
    const { products, adminPassword } = JSON.parse(event.body || "{}");

    if (!Array.isArray(products)) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "products must be an array" })
      };
    }

    if (
      !process.env.ADMIN_PASSWORD ||
      adminPassword !== process.env.ADMIN_PASSWORD
    ) {
      return {
        statusCode: 401,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Invalid admin password" })
      };
    }

    const token = process.env.GITHUB_TOKEN;

    if (!token) {
      return {
        statusCode: 500,
        headers: { "Content-Type": "application/json" },
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

    const currentResponse = await fetch(
      `${apiUrl}?ref=${branch}`,
      { headers }
    );

    if (!currentResponse.ok) {
      return {
        statusCode: currentResponse.status,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          error: "Could not read products.json from GitHub"
        })
      };
    }

    const currentFile = await currentResponse.json();

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
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          error: "GitHub update failed",
          details: result
        })
      };
    }

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        success: true,
        message: "Products updated successfully"
      })
    };

  } catch (error) {
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        error: error.message
      })
    };
  }
};
