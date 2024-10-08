import {
  writeFileSync,
  unlinkSync,
  existsSync,
  mkdirSync,
  createWriteStream
} from 'fs';
import { join as joinPath, resolve as resolvePath } from 'path';
import latex from 'node-latex';
import LatexBuilder from './latex-builder';
import ResumeBuilder from './resume-builder';
import { logger } from './logger';
import { ResumeGeneratorConfig } from './init';

export const generate = (
  config: ResumeGeneratorConfig,
  resume: ResumeBuilder
) => {
  const buildStart = Date.now();
  logger.info(
    'Starting build at ' +
      new Date(buildStart).toLocaleDateString() +
      ' ' +
      new Date(buildStart).toLocaleTimeString()
  );

  const filename =
    resume.filename ?? `${resume.name} Resume ${new Date().getFullYear()}`;
  
  // Create dist/ if it doesn't exist, otherwise node fs will throw an error
  const outputDir = resolvePath(__dirname, '../dist');
  if (!existsSync(outputDir)) mkdirSync(outputDir);

  logger.info('Generating TeX file');
  // Generate LaTeX document
  const builder = new LatexBuilder(resume);
  const latexDoc = builder.document;
  // After generating the LaTeX document, check for warnings
  builder.warnings.forEach((warning) => logger.log('warn', warning));
  // Write LaTeX document to file
  writeFileSync(joinPath(outputDir, filename + '.tex'), builder.document);

  logger.info('Compiling to PDF');
  const output = createWriteStream(joinPath(outputDir, filename + '.pdf'));
  // Compile LaTeX document to PDF
  const pdf = latex(latexDoc);

  // Handle errors during compilation
  pdf.on('error', (err) => {
    logger.error(err);
    if (existsSync(joinPath(outputDir, filename + '.pdf'))) {
      unlinkSync(joinPath(outputDir, filename + '.pdf'));
    }
    process.exit(1);
  });

  // Handle successful compilation
  pdf.on('finish', () => {
    const buildEnd = Date.now();
    const buildTime = (buildEnd - buildStart) / 1000;
    logger.info(`Build time: ${buildTime}s`);
    logger.info(`Output: dist/${filename.replaceAll(/\s/g, '\u00A0')}.pdf`);
    logger.log('done', `Resume generated successfully`);
  });

  pdf.pipe(output);
};
