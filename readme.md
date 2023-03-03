# Melonworm ( Mavenlink Dashboard )

This is an internal tool I wrote in mid-2018 to solve an imperfect problem I saw arise in a rapidly growing company facing an onslaught in volume of work. The tool is a quick and dirty dashboard helping 3-4 designers handle graphic requests from several siloed accounts teams serving a couple hundred client accounts that at peak needed 40-60 graphics in a workday.

At the time we were using the project management software Mavenlink, but it was not able to keep up with our usage. Team members were drowning in emails and things were being missed on all sides, clients were frustrated but folks were just trying to push through the end of the year when workload would subside and we would switch project management software. This tool acts as a layer on top of Mavenlink, displaying a dashboard combining all active work of a single type instead of having to dip into a dozen separate client projects to get a read on how things were moving.

It does all this by chronologically parsing all tasks and discussions threads in Mavenlink and building a kanban board of cards. It has a few underlying filters that fuzzy-categorize human written messages into 7 MUCH more helpful statuses than the default 3. It also compensates for human error and can add due dates and assignees even if those are not set and provide quick direct links back to associated projects and discussion threads.

Oh yeah... the name... the first prototype I made of it was late on a Friday night and I was trying to think of how to incentivize refreshing and I came up with the idea of rolling 2D6 behind the scenes and on boxcars it would add a dancing chomping pixel art worm made out of melons.
