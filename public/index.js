document.addEventListener('DOMContentLoaded', () => {
    const documentationContainer = document.getElementById('documentation');
    const headerTitle = document.querySelector('header h1');
    const headerDetails = document.querySelector('header p');
    const footerText = document.querySelector('footer p');
    const githubLink = document.querySelector('footer a');
    const tableOfContents = document.getElementById('table-of-contents');

    // Fetch the configuration
    fetch('config.json')
        .then(response => response.json())
        .then(config => {
            headerTitle.textContent = config.title;
            headerDetails.textContent = config.details;
            footerText.innerHTML = `${config.footer} <a href="${config.githubLink}" target="_blank">GitHub</a>`;
            githubLink.href = config.githubLink;
        })
        .catch(error => console.error('Error fetching the configuration:', error));

    // Fetch the documentation data
    fetch('docu.json')
        .then(response => response.json())
        .then(docuData => {
            // Create Table of Contents
            const tocList = document.createElement('ul');
            tocList.className = 'table-of-contents';
            docuData.forEach((endpoint, index) => {
                const anchorId = `endpoint-${index}`;
                const tocItem = document.createElement('li');
                const tocLink = document.createElement('a');
                tocLink.href = `#${anchorId}`;
                tocLink.textContent = `${endpoint.method} ${endpoint.endpoint}`;
                tocItem.appendChild(tocLink);
                tocList.appendChild(tocItem);

                // Create Endpoint Section
                const section = document.createElement('section');
                section.id = anchorId;
                section.className = 'endpoint';

                const methodHeader = document.createElement('h2');
                methodHeader.textContent = `${endpoint.method} ${endpoint.endpoint}`;
                section.appendChild(methodHeader);

                const description = document.createElement('p');
                description.textContent = endpoint.description;
                section.appendChild(description);

                let queryString = '';
                if (endpoint.requestParameters && endpoint.requestParameters.length > 0) {
                    const requestParamsHeader = document.createElement('h3');
                    requestParamsHeader.textContent = 'Request Parameters';
                    section.appendChild(requestParamsHeader);

                    const requestParamsList = document.createElement('ul');
                    endpoint.requestParameters.forEach(param => {
                        const paramItem = document.createElement('li');
                        paramItem.innerHTML = `<code>${param.name}</code>: ${param.description}`;
                        requestParamsList.appendChild(paramItem);
                        queryString += `${param.name}=${param.testValue}&`;
                    });
                    section.appendChild(requestParamsList);
                    queryString = queryString.slice(0, -1); // Remove trailing '&'
                }

                let requestBodyString = '';
                if (endpoint.requestBody) {
                    const requestBodyHeader = document.createElement('h3');
                    requestBodyHeader.textContent = 'Request Body';
                    section.appendChild(requestBodyHeader);

                    const requestBodyCode = document.createElement('div');
                    requestBodyCode.className = 'code-block';
                    requestBodyCode.innerHTML = `<pre><code>${JSON.stringify(endpoint.requestBody, null, 4)}</code></pre>`;
                    section.appendChild(requestBodyCode);

                    requestBodyString = JSON.stringify(endpoint.requestBody, null, 4);
                }

                const responseHeader = document.createElement('h3');
                responseHeader.textContent = 'Response';
                section.appendChild(responseHeader);

                const responseCode = document.createElement('div');
                responseCode.className = 'code-block';
                responseCode.innerHTML = `<pre><code>${JSON.stringify(endpoint.response, null, 4)}</code></pre>`;
                section.appendChild(responseCode);

                if (endpoint.errors && endpoint.errors.length > 0) {
                    const errorsHeader = document.createElement('h3');
                    errorsHeader.textContent = 'Errors';
                    section.appendChild(errorsHeader);

                    const errorsList = document.createElement('ul');
                    errorsList.className = 'error-list';
                    endpoint.errors.forEach(error => {
                        const errorItem = document.createElement('li');
                        errorItem.innerHTML = `<code>${error.code}</code>: ${error.description}`;
                        errorsList.appendChild(errorItem);
                    });
                    section.appendChild(errorsList);
                }

                // Example Implementation Section
                const exampleHeader = document.createElement('h3');
                exampleHeader.textContent = 'Example Implementation';
                section.appendChild(exampleHeader);

                const exampleImplementation = document.createElement('div');
                exampleImplementation.className = 'example-implementation';

                let fetchExample = `
                    <h4>Fetch API</h4>
                    <div class="code-block">
                        <pre><code>
fetch('${endpoint.endpoint}${queryString ? '?' + queryString : ''}', {
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
curl -X ${endpoint.method} ${endpoint.endpoint}${queryString ? '?' + queryString : ''}`;

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

                documentationContainer.appendChild(section);
            });

            // Append Table of Contents
            tableOfContents.appendChild(tocList);
        })
        .catch(error => console.error('Error fetching the documentation:', error));
});
