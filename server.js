const http = require('http');
const url = require('url');
const axios = require('axios');

// Helper function to modify URLs in the HTML to point to the proxy
function modifyUrls(html, baseUrl) {
    return html.replace(/(href|src)=["']([^"']+)["']/g, (match, p1, p2) => {
        // Convert relative URLs to absolute
        let absoluteUrl = p2;
        if (!p2.startsWith('http')) {
            absoluteUrl = new URL(p2, baseUrl).href;
        }
        // Replace the URL with a proxied URL
        return `${p1}="/proxy?url=${encodeURIComponent(absoluteUrl)}"`;
    });
}

// Create the server
http.createServer(async (req, res) => {
    const parsedUrl = url.parse(req.url, true);
    const pathname = parsedUrl.pathname;
    const query = parsedUrl.query;

    if (pathname === '/') {
        // Main route for fetching the HTML of the specified website
        if (query.url) {
            try {
                const response = await axios.get(query.url);

                // Modify the HTML content to proxy resource URLs
                const modifiedHtml = modifyUrls(response.data, query.url);

                // Send the modified HTML content
                res.writeHead(200, { 'Content-Type': 'text/html' });
                res.end(modifiedHtml);
            } catch (error) {
                res.writeHead(500, { 'Content-Type': 'text/plain' });
                res.end('Error fetching the website.');
            }
        } else {
            res.writeHead(400, { 'Content-Type': 'text/plain' });
            res.end('Please specify a website using the url query parameter, e.g., /?url=https://example.com');
        }
    } else {
        // Proxy route for fetching resources
        const resourceUrl = query.url || `https://${req.headers.host}${req.url}`;

        try {
            const response = await axios.get(resourceUrl, { responseType: 'arraybuffer' });

            // Detect content type and set it in the response headers
            const contentType = response.headers['content-type'] || 'application/octet-stream';
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(response.data);
        } catch (error) {
            res.writeHead(500, { 'Content-Type': 'text/plain' });
            res.end('Error fetching the resource.');
        }
    }
}).listen(3000, () => {
    console.log('Server is running on http://localhost:3000');
});