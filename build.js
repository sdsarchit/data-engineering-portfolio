const fs = require('fs');
const path = require('path');
const CleanCSS = require('clean-css');
const { minify } = require('html-minifier-terser');
const JavaScriptObfuscator = require('javascript-obfuscator');

const srcDir = path.join(__dirname, 'frontend');
const destDir = path.join(__dirname, 'dist');

const cssMinifier = new CleanCSS({
    returnPromise: false
});

const htmlMinifyOptions = {
    collapseWhitespace: true,
    removeComments: true,
    minifyJS: false, // JS is minified and obfuscated separately
    minifyCSS: true,  // Minify inline style attributes
    useShortDoctype: true,
    removeEmptyAttributes: true,
    removeRedundantAttributes: true
};

const obfuscationOptions = {
    compact: true,
    controlFlowFlattening: true,
    controlFlowFlatteningThreshold: 0.75,
    deadCodeInjection: true,
    deadCodeInjectionThreshold: 0.4,
    debugProtection: true,           // Continuous debugger trap when DevTools is opened
    debugProtectionInterval: 2000,
    disableConsoleOutput: true,      // Suppress console outputs in production
    identifierNamesGenerator: 'hexadecimal',
    log: false,
    renameGlobals: false,            // Keep global window functions functional
    selfDefending: true,             // Crashes script if developer tries to beautify/format
    stringArray: true,
    stringArrayRotate: true,
    stringArrayShuffle: true,
    stringArrayThreshold: 0.75,
    transformObjectKeys: true,
    unicodeEscapeSequence: false
};

async function runBuild() {
    console.log("Starting production build pipeline...");
    
    // 1. Clean and recreate dist directory
    if (fs.existsSync(destDir)) {
        fs.rmSync(destDir, { recursive: true, force: true });
    }
    fs.mkdirSync(destDir, { recursive: true });
    console.log("- Re-created clean 'dist/' directory.");

    // 2. Read and process all files in frontend/
    const files = fs.readdirSync(srcDir);
    
    for (const file of files) {
        const srcPath = path.join(srcDir, file);
        const destPath = path.join(destDir, file);
        const stat = fs.statSync(srcPath);
        
        if (stat.isDirectory()) {
            continue; // Skip folders
        }

        const ext = path.extname(file).toLowerCase();
        
        if (ext === '.js') {
            console.log(`- Obfuscating JS: ${file}`);
            const rawCode = fs.readFileSync(srcPath, 'utf8');
            try {
                const obfuscatedResult = JavaScriptObfuscator.obfuscate(rawCode, obfuscationOptions);
                const obfuscatedCode = obfuscatedResult.getObfuscatedCode();
                fs.writeFileSync(destPath, obfuscatedCode, 'utf8');
            } catch (err) {
                console.error(`ERROR obfuscating JS file ${file}:`, err);
                process.exit(1);
            }
        } else if (ext === '.css') {
            console.log(`- Minifying CSS: ${file}`);
            const rawCSS = fs.readFileSync(srcPath, 'utf8');
            const minifiedCSS = cssMinifier.minify(rawCSS).styles;
            fs.writeFileSync(destPath, minifiedCSS, 'utf8');
        } else if (ext === '.html') {
            console.log(`- Minifying HTML: ${file}`);
            const rawHTML = fs.readFileSync(srcPath, 'utf8');
            try {
                const minifiedHTML = await minify(rawHTML, htmlMinifyOptions);
                fs.writeFileSync(destPath, minifiedHTML, 'utf8');
            } catch (err) {
                console.error(`ERROR minifying HTML file ${file}:`, err);
                process.exit(1);
            }
        } else {
            console.log(`- Copying static asset: ${file}`);
            fs.copyFileSync(srcPath, destPath);
        }
    }
    
    console.log("Build successfully completed! Production assets ready in 'dist/'.");
}

runBuild().catch(err => {
    console.error("Critical build failure:", err);
    process.exit(1);
});
