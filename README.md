# PerceptLab

PerceptLab is an interactive computer vision sandbox for building intuition before writing a full perception pipeline. It turns common image-analysis algorithms into visible, adjustable experiments that run entirely in the browser.

## What it explores

- **RANSAC:** line, plane, circle, and ellipse fitting with adjustable sampling, thresholds, and iteration counts.
- **Color clustering:** K-Means++ in RGB, LAB, or HSV color space.
- **Depth clustering:** luminance-based depth bins followed by spatial DBSCAN grouping.
- **Instrumentation:** live algorithm logs, progress feedback, inlier rates, cluster counts, and runtime statistics.

## Run locally
You can access this locally or simply by my Github Page which it is being hosted on currently.

## Why it exists

The project is designed as a visual notebook: make an algorithm legible, change one assumption, and watch the result move. Synthetic scenes provide repeatable starting points, while image upload makes it possible to test the same ideas on real data. It was heavily inspired by taking CS 3630 in Spring 2026 where we worked on developing this algorithms in our coding assignments, but I struggled to visualize what was actually happening and wanted an easy tool to do so. We were introduced to similiar tools for CNNs and I thought it would be a cool exercise to tackle!
