# Siddharth Chattoraj's Sent Instagram DMs
MAT 236: Project 2

By: Siddharth Chattoraj

## Project Functionality

This data portrait depics all Instgram DMs I have sent in my lifetime, from when I first downloaded in Instagram in November 2017 to November 2025. Users can toggle between daily, monthly, yearly, hourly, and overall views, and they can select each bar from the chart at the bottom to learn more about my DMing habits at that moment in my life. On thr right side, there is a dashboard that displays top word formations, top emojis, and message statistics, and users can click to proceed to the next moment in time. On the left side, there is an interactive 3D word embedding space graph that displays what terms were used in similar contexts for that moment in time, according to data from a Word2Vec model I created. Closer terms represent words used in similar contexts. An example of the application is provided in `example.png`.

## Design Principles

When I send messages, unless I'm very close with the recipient, my approach has been to spend time curating the words within my messages to portray a specific tone (e.g. using "i" vs. "me", or using "yes" vs. "yas" vs. "yea" vs. "yaas") or to provide a level of detail (e.g. if asking about hiking in Seattle, mentioning specific terms like the "Cascades" rather than being vague) that enables me to receive a message back quickly directly. When I'm messaging people close to me, my approach has been to DM freely in short bursts without as much care to the exact tone or detail being conveyed. However, I am interested in what the overarching picture of my direct messages appear like and what words I frequently use in which contexts to better understand how I communicate overall. 

In developing this project, I was inspired by existing interactive embedding explorers like [TensorFlow's Projector](https://projector.tensorflow.org/) and social media/application data visualizers like [Stats for Spotify](https://www.statsforspotify.com/), but I wanted to apply these existing methods to Instagram—a messaging tool I use frequently—on a deeper scale to visualize the specific ways and frequency by which I communicate. 

## Process

I obtained all sent and received Instagram messages data by exporting my personal data from the Meta Accounts Center, and I wrote Python scripts in `data_processing.ipynb` to extract the messages from individual `.json` files, concatenate them, filter out received messages, and clean the data. Afterward, I processed the data for conducting sentiment analysis and creating a `Word2Vec` model to obtain 3-dimensional embeddings.

I built the visualization system by structuring the project into files that separately handle the layout, bar-chart rendering, dashboard rendering, and the 3D embedding space for the word vectors. 

- **`app.js`** runs the system. It loads all of the processed data, keeps track of which time period the user is viewing, and updates every part of the screen when something changes.

- **`bar.js`** draws the bottom bar chart and handles hovering and clicking so users can select a specific day, month, year, or hour.

- **`dashboard.js`** draws the right-side panel and fills it with message statistics, top words, and top emojis for the selected moment in time.

- **`word2vec.js`** creates the interactive 3D space on the left, showing how words group together based on how I used them in my messages.

This structure allowed me to build the project in stages: clean the data, load it into the interface, and then layer the chart, dashboard, and word embeddings (in that order) before making edits across the application until they all aspects together smoothly.

## Reflections and Outcomes

I initially tried to build all processing and visualization aspects of the project (data processing, summary statistics, word embeddings, word frequency, etc.) in parallel with each other, but that ended up in creating inefficient, messy code. When I built the current version of the application, I designed it from the ground up, working in small steps and building each aspect of the application by itsef. Then, when I saw improvements that could be made (like fixing the rendering of the emojis in the visualization so it shows up as actual emojis or editing the Word2Vec parameters for greater accuracy), I could efficiently and smoothly make changes across the application and have them apply to all parts because I had the pipeline in place for doing so.

From my data portrait, I learned that I send many short DMs to people I know well, and that my messaging volume increases during periods of transition (new academic quarters, new years, travel) or heavy work periods (late night). However, I recognize that I have been texting more on iMessages as more people in my surroundings have shifted to it as our collective age has increased, and consequently my Instagram usage has decreased since 2023. 

More specifically, I used to use Instagram as a place to often wish people "happy birthday" during middle and high schoo. Furthermore, across the overall timeline, I use Instagram to request people to send me attachments or files that I need and coordinate meetups to eat over quite frequently. I also express emotions of shared excitement (🥳) and empathetic sadness (😭) through those two emojis quite often. 

Overall, this project helped me see my Instagram DMs not just as scattered conversations but as a long-term record of how my relationships, habits, and communication styles change over time. Building the portrait made those patterns visible, and highlighted how consistently my language shifts in response to the people and contexts in my life.