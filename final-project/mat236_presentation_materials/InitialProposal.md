# p5.chart: Interactive Data Visualization and Manipulation Library for p5.js (Proposal)

I plan to build `p5.chart`, an interactive data visualization and manipulation add-on library for p5.js. The library will include three main components:

- DataFrames for data analysis: Filtering, grouping, function applications, statistical methods, etc.
  
- Graphs: Interactive chart constructors for line plots, bar plots, scatter plots, histograms, pie charts, etc.
  
- Maps: Data-driven point maps 
Key technical considerations

I will implement a DataFrame class on top of plain JavaScript arrays/objects with import helpers from p5.Table, CSV, and JSON I will build interactive graph templates with p5.js and create maps using p5.js and GeoJSON. 

DataFrames will enable users to load, clean, transform, summarize, and perform operations on datasets inside p5.js. Graphs and maps will be interactive by default, and the base template will enable users to quickly visualize data with few lines of code. The library will be accessible to users with only a limited knowledge of JavaScript or coding in general, but advanced users will be able to create detailed interactive charts using the library’s in-depth customization features
Documentation and formatting will follow the p5.js library creation guidelines

A successful result witll include a completed p5.chart library that includes comprehensive documentation and examples so any beginner can learn the base template and intermediate-to-advanced users can explore custom design methods. Furthermore, by the conclusion of my project, I will submit the library for potential publication on the p5.js website.

Choosing which functionalities and features within the library to include and prioritize development on will be the biggest challenges I face, as there are many possible data visualization tools that I can produce but limited time to create the library.
