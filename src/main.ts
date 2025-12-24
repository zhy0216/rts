import { argv } from 'process';
import fs from 'fs';
import path from 'path';
import { transpile } from './program';

if (argv.length < 3) {
  throw new Error(
    'Usage: ./main <input_file_or_directory> <output_file_or_directory>'
  );
}

const inputPath = argv[argv.length - 2];
const outputPath = argv[argv.length - 1];
const isOutputFile = path.extname(outputPath) === '.c';

// Create output directory if it doesn't exist and it's not a file output
if (!isOutputFile && !fs.existsSync(outputPath)) {
  fs.mkdirSync(outputPath, { recursive: true });
}

/**
 * Process a single RTS file and compile it to C
 */
function processFile(inputFilePath: string, outputTarget: string): void {
  try {
    // Determine output path based on whether we're processing a directory or single file
    const isDirectoryProcess = fs.statSync(inputPath).isDirectory();
    let outputFilePath: string;

    // If the output has .c extension, it's a direct file output
    if (path.extname(outputTarget) === '.c') {
      outputFilePath = outputTarget;
    } else if (isDirectoryProcess) {
      // Calculate relative path to maintain directory structure
      const relativePath = path.relative(inputPath, inputFilePath);
      const relativeDir = path.dirname(relativePath);
      const outputFileName = path.basename(inputFilePath, '.rts') + '.c';

      // Create output directory structure if needed
      const fullOutputDir = path.join(outputTarget, relativeDir);
      if (!fs.existsSync(fullOutputDir)) {
        fs.mkdirSync(fullOutputDir, { recursive: true });
      }

      outputFilePath = path.join(fullOutputDir, outputFileName);
    } else {
      // Single file case with directory output
      outputFilePath = outputTarget;
      if (
        fs.existsSync(outputTarget) &&
        fs.statSync(outputTarget).isDirectory()
      ) {
        const outputFileName = path.basename(inputFilePath, '.rts') + '.c';
        outputFilePath = path.join(outputTarget, outputFileName);
      }
    }

    // Read, process and write the file
    const sourceCode = fs.readFileSync(inputFilePath, {
      encoding: 'utf8',
      flag: 'r',
    });

    fs.writeFileSync(outputFilePath, transpile(sourceCode));
    console.log(`Processed: ${inputFilePath} -> ${outputFilePath}`);
  } catch (error) {
    console.error(`Error processing ${inputFilePath}:`, error);
  }
}

/**
 * Recursively process all .rts files in a directory and its subdirectories
 */
function processDirectory(dirPath: string, outputTarget: string): void {
  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);

      if (entry.isDirectory()) {
        // Recursively process subdirectories
        processDirectory(fullPath, outputTarget);
      } else if (entry.isFile() && path.extname(entry.name) === '.rts') {
        // Process RTS files
        processFile(fullPath, outputTarget);
      }
    }
  } catch (error) {
    console.error(`Error processing directory ${dirPath}:`, error);
  }
}

// Check if input is a directory or a file
const inputStats = fs.statSync(inputPath);

// If the output has .c extension and input is a directory, we can't output multiple files to one file
if (isOutputFile && inputStats.isDirectory()) {
  throw new Error(
    'Cannot output multiple .rts files to a single .c file. Please provide a directory as output.'
  );
}

if (inputStats.isDirectory()) {
  // Process all .rts files in the directory and subdirectories
  processDirectory(inputPath, outputPath);
  console.log('Compilation complete.');
} else {
  // Process a single file
  if (path.extname(inputPath) !== '.rts') {
    console.warn('Warning: Input file does not have .rts extension.');
  }

  processFile(inputPath, outputPath);
}
