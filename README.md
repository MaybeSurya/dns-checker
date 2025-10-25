# React DNS-over-HTTPS (DoH) Checker

A lightweight, static web app built with React to query and compare DNS records from multiple DNS-over-HTTPS (DoH) providers. Features dark mode, search history, and JSON export.

## Download

You can download all the project files as a single ZIP package directly from GitHub.

1.  On the main page of this repository, click the green **<> Code** button (usually in the top-right corner).
2.  Select **Download ZIP** from the dropdown menu.

This will save a ZIP file containing all the files listed in this project.

---

## How to Host (Static)

This project is a static website. It **does not require a Node.js server** or complex build steps to run.

To make the code work properly, you only need to upload the **4 Required Files** to your server. The other files are optional development tools and are not needed for the live application to work.

### Required Files (Upload these)
These are the only 4 files you need to upload to your static web host (like GitHub Pages, Netlify, Vercel, or a simple Apache/Nginx server).

* `index.html` - The main HTML page that loads all other assets.
* `dnsCheckerComponent.js` - The main React application logic.
* `app.js` - The script that starts the React app.
* `style.css` - The custom stylesheet for light/dark mode and layout.

### Optional Developer/Other Files (Not needed for hosting)
You **do not** need to upload these files for the website to work. They are for local development, debugging, or optional server-side features.

* `package.json` - Used for `npm` to manage local development.
* `check_parens.js` - A utility script for developers to check code.
* `find_unclosed_paren.js` - A utility script for developers to check code.
* `paren_counts.js` - A utility script for developers to check code.
* `dnsCheckerComponent.temp.js` - A temporary backup or test file.
* `query.php` - An *optional* PHP backend for an alternative `dig`-based query method. The main app does not use this.

---

## Preview

![DNS Checker Preview](https://api.files.suryahost.in/dns-checker-github-project.png)

---

## Features

* **Multi-Resolver Comparison:** Queries and displays results from Google (8.8.8.8) and Cloudflare (1.1.1.1) side-by-side.
* **Multiple Record Types:** Supports common DNS record types, including `A`, `AAAA`, `CNAME`, `MX`, `NS`, `SOA`, `TXT`, and more.
* **Query Latency:** Shows the time (in milliseconds) each provider took to respond.
* **Local Storage History:** Automatically saves your recent queries to your browser's local storage for easy re-checking.
* **Persistent Dark Mode:** Includes a light/dark mode toggle that remembers your preference.
* **Export to JSON:** Download the complete, raw JSON response from all providers with a single click.
* **No Build Required:** Runs directly in the browser using React from a CDN.
* **DNS FAQ:** A collapsible FAQ section to help users understand common DNS concepts.

---

## Local Development (Optional)

If you want to modify the code or run it locally using a development server (which uses the `package.json` file).

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/MaybeSurya/dns-checker.git
    cd dns-checker
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Start the development server:**
    ```bash
    npm start
    ```
    This will open the app in your browser at `http://localhost:3000`.

4.  **Build for production (Optional):**
    ```bash
    npm run build
    ```
    This will create a `build` folder with optimized static files, which you can then upload to your server.

---

## AI Assistance & Contributing

This project was initially developed with AI assistance. As a result, contributions are highly encouraged!

If you spot a bug, have a feature request, or see a potential security vulnerability, please feel free to:

1.  **Fork** the repository.
2.  Create a new **branch** (`git checkout -b feature/MyFix`).
3.  Make your changes and **commit** them (`git commit -m 'Fix a bug'`).
4.  **Push** to the branch (`git push origin feature/MyFix`).
5.  Open a **Pull Request**.

---

## License

This project is licensed under the **MIT License**.

### A Note on the Watermark

This project is free and open-source. If you find this tool useful, I politely ask that you keep the watermark in the footer as a form of credit. While the MIT license legally permits you to remove it, keeping it helps support the project and acknowledge the work that went into it. Thank you!
