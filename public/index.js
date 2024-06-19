document.addEventListener("DOMContentLoaded", () => {
  const documentationContainer = document.getElementById("documentation");
  const tocContainer = document.getElementById("toc");
  const headerTitle = document.querySelector("header h1");
  const headerDetails = document.querySelector("header p");
  const footerText = document.querySelector("footer p a");

  // Fetch the configuration
  fetch("config.json")
    .then((response) => response.json())
    .then((config) => {
      headerTitle.textContent = config.title;
      headerDetails.textContent = config.details;
      footerText.href = config.githubLink;
      footerText.textContent = "GitHub";
      document.querySelector(
        "footer p"
      ).innerHTML = `${config.footer} <a href="${config.githubLink}" target="_blank">GitHub</a>`;
    })
    .catch((error) =>
      console.error("Error fetching the configuration:", error)
    );

  // Fetch the documentation data
  fetch("docu.json")
    .then((response) => response.json())
    .then((docuData) => {
      const tocList = document.createElement("ul");
      docuData.forEach((group, groupIndex) => {
        // Create TOC group entry
        const tocGroupItem = document.createElement("li");
        const tocGroupLink = document.createElement("a");
        tocGroupLink.className = "toc-group";
        tocGroupLink.href = `#group-${groupIndex}`;
        tocGroupLink.textContent = group.group;
        tocGroupItem.appendChild(tocGroupLink);

        const tocSubList = document.createElement("ul");
        group.endpoints.forEach((endpoint, endpointIndex) => {
          const tocSubItem = document.createElement("li");
          const tocSubLink = document.createElement("a");
          tocSubLink.className = "toc-endpoint";
          tocSubLink.href = `#group-${groupIndex}-endpoint-${endpointIndex}`;
          tocSubLink.textContent = `${endpoint.method} ${endpoint.endpoint}`;
          tocSubItem.appendChild(tocSubLink);
          tocSubList.appendChild(tocSubItem);
        });

        tocGroupItem.appendChild(tocSubList);
        tocList.appendChild(tocGroupItem);

        // Create documentation group section
        const groupSection = document.createElement("section");
        groupSection.className = "group";
        groupSection.id = `group-${groupIndex}`;

        const groupHeader = document.createElement("h2");
        groupHeader.textContent = group.group;
        groupSection.appendChild(groupHeader);

        group.endpoints.forEach((endpoint, endpointIndex) => {
          const section = document.createElement("section");
          section.className = "endpoint";
          section.id = `group-${groupIndex}-endpoint-${endpointIndex}`;

          const methodHeader = document.createElement("h3");
          methodHeader.textContent = `${endpoint.method} ${endpoint.endpoint}`;
          section.appendChild(methodHeader);

          const description = document.createElement("p");
          description.textContent = endpoint.description;
          section.appendChild(description);

          let queryString = "";
          // Request Parameters
          if (
            endpoint.requestParameters &&
            endpoint.requestParameters.length > 0
          ) {
            const requestParamsHeader = document.createElement("h4");
            requestParamsHeader.textContent = "Request Parameters";
            section.appendChild(requestParamsHeader);

            const requestParamsList = document.createElement("ul");
            endpoint.requestParameters.forEach((param) => {
              const paramItem = document.createElement("li");
              paramItem.textContent = `${param.name}: ${param.description} (e.g., ${param.testValue})`;
              requestParamsList.appendChild(paramItem);
              queryString += `${param.name}=${param.testValue}&`;
            });
            section.appendChild(requestParamsList);
            queryString = queryString.slice(0, -1); // Remove trailing '&'
          }

          let requestBodyString = "";
          // Request Body
          if (endpoint.requestBody) {
            const requestBodyHeader = document.createElement("h4");
            requestBodyHeader.textContent = "Request Body";
            section.appendChild(requestBodyHeader);

            const requestBody = document.createElement("pre");
            requestBody.textContent = JSON.stringify(
              endpoint.requestBody,
              null,
              2
            );
            section.appendChild(requestBody);

            requestBodyString = JSON.stringify(endpoint.requestBody, null, 4);
          }

          // Response
          const responseHeader = document.createElement("h4");
          responseHeader.textContent = "Response";
          section.appendChild(responseHeader);

          const response = document.createElement("pre");
          response.textContent = JSON.stringify(endpoint.response, null, 2);
          section.appendChild(response);

          // Errors
          if (endpoint.errors && endpoint.errors.length > 0) {
            const errorsHeader = document.createElement("h4");
            errorsHeader.textContent = "Errors";
            section.appendChild(errorsHeader);

            const errorsList = document.createElement("ul");
            endpoint.errors.forEach((error) => {
              const errorItem = document.createElement("li");
              errorItem.textContent = `${error.code}: ${error.description}`;
              errorsList.appendChild(errorItem);
            });
            section.appendChild(errorsList);
          }

          // Example Implementation
          const exampleHeader = document.createElement("h4");
          exampleHeader.textContent = "Example Implementation";
          section.appendChild(exampleHeader);

          const exampleImplementation = document.createElement("div");
          exampleImplementation.className = "example-implementation";

          let fetchExample = `
                    <h4>Fetch API</h4>
                    <div class="code-block">
                        <pre><code>
fetch('${endpoint.endpoint}${queryString ? "?" + queryString : ""}', {
    method: '${endpoint.method}',`;

          if (requestBodyString) {
            fetchExample += `
    headers: {
        'Content-Type': 'application/json'
    },
    body: JSON.stringify(${requestBodyString})`;
          }

          fetchExample += `
})
    .then(response => response.json())
    .then(data => console.log(data))
    .catch(error => console.error('Error:', error));
                        </code></pre>
                    </div>
                `;

          let curlExample = `
                    <h4>cURL</h4>
                    <div class="code-block">
                        <pre><code>
curl -X ${endpoint.method} ${endpoint.endpoint}${
            queryString ? "?" + queryString : ""
          }`;

          if (requestBodyString) {
            curlExample += ` \\
    -H "Content-Type: application/json" \\
    -d '${requestBodyString}'`;
          }

          curlExample += `
                        </code></pre>
                    </div>
                `;

          exampleImplementation.innerHTML = fetchExample + curlExample;
          section.appendChild(exampleImplementation);

          groupSection.appendChild(section);
        });

        documentationContainer.appendChild(groupSection);
      });

      tocContainer.appendChild(tocList);
    })
    .catch((error) =>
      console.error("Error fetching the documentation data:", error)
    );
});
