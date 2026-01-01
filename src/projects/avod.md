---
layout: /layout.njk
title: Anti-Virus on Demand
permalink: /projects/avod.html
---

# Anti-Virus on Demand

This is a writeup of how I built **AVoD**, an antivirus-as-a-service platform based on Cisco’s ClamAV, and how it slowly evolved from a light Python script into a production service that has been tested to easily scan 50,000 files a day.

The goal from day one was straightforward: make malware scanning a hard requirement for file uploads without forcing every application team to become antivirus experts.

If an application wants to save a file, it has to ask AVoD first.

---

### The Demand

At its core, AVoD sits directly in the upload path.
Application teams could offload antivirus scanning to a central service instead of embedding logic into every codebase. Additionally, it added potection in that files wouldn't be saved to any systems until they were verified to be safe.
There are file storage scenarios that are tricky for traditional anti-virus to scan. One such type that comes to mind is when files are stored inside of an SQL database. Files in here would evade anti-virus that patrol's the filesystem.


### Design

When a user uploads a file, the application server doesn’t immediately write it to disk or object storage. Instead, it posts the file to AVoD and waits. AVoD saves the file locally using a random GUID to avoid path traversal shenanigans, asks ClamAV to scan it, deletes the local copy, amd sends JSON back with the result. Only then does the application decide whether the file is allowed to exist.
`freshclam` runs as its own process and updates the virus signature database that clamd scans against daily.

That flow hasn’t changed much over time, though the implementation around it has.

---

### First Iteration: A Python Script Windows

The very first version of AVoD was intentionally simple. I wrote a barebones Python service that utilized FastAPI. Its job was to accept incoming requests, save files to disk, tell `clamd` which file to scan, then pass the results back to the requestor as JSON.

It worked and more importantly, it proved the concept.

But it was also very obviously a first iteration. It was tightly coupled to the Windows filesystem, didn’t scale particularly well, and had minimal visibility into what was happening when something went wrong. As traffic increased, the cracks started to show.


### Second Iteration: Installing as a Windows Service

There needed to be a more robust way to handle anything that may happen to the service. 
Windows Services would handle any crashes or errors and be able to restart the application.

### Third Interation: Blob Storage

At one point, I experimented with writing files into Azure Blob Storage, then configuring Azure Defender for Storage to scan the file and add a tag. In this scenario, AVoD work as a service that check for that tag that Defender left on the blob to tell us if the file was scanned and relay the results to the original requestor.

On paper, this seemed attractive: no local disk concerns, easy durability, no resource consumption by the anti-virus scanner, no maintenance of virus databases, and clean separation of responsibilities.

In practice, it didn’t work the way I needed it to.

Blob storage introduced unpredictable delays between when an upload completed and when the file was actually available for scanning. For an asynchronous workflow that might have been fine, but AVoD is inline with uploads. When a user is waiting on a response, “usually fast” isn’t good enough.

That experiment was short-lived, but it was valuable. It reinforced that for synchronous malware scanning, local disk I/O is hard to beat for predictability.


### Fourth Iteration: Containerization and Cloud Hosting

The real turning point came when AVoD was containerized.

I packaged the Python service and ClamAV together into a container based on Alpine Linux and redeployed it first on-prem and later in Azure. Suddenly, a lot of problems got easier. Environments were consistent. Deployment stopped being fragile. Scaling stopped being a manual exercise.

Eventually, the service was deployed as an Azure Web App through a pipeline, and AVoD started to look like a real platform component instead of a clever script.
Cost analysis

---

### First Upgrade: Connection Pooling

One issue that didn’t show up immediately was connection stability to `clamd`. Initially, every scan opened a new TCP connection to the ClamAV daemon. Under light load, that was fine. Under sustained throughput, it was not.

Connections would occasionally drop, scans would fail, and latency would spike at exactly the wrong times.

The fix was to introduce connection pooling between AVoD and `clamd`. Instead of constantly opening and closing sockets, the service maintains a pool of persistent connections and reuses them. It’s not a flashy feature, but it made a dramatic difference in reliability once traffic picked up.


### Second Upgrade: Load Testing

Once AVoD was handling real traffic, guessing stopped being acceptable. I needed to know how it behaved under stress, not just hope it would be fine.

I added automated sale out through Azure to expand the number of available containers when load began increasing and hopefully help absorb the load.

I built a load testing suite using **Locust** that simulates real upload behavior: different file sizes, concurrent requests, and sustained load. This made it possible to tune things like connection pool sizing and validate changes before they ever hit production.

If there’s one thing this project reinforced, it’s that load testing isn’t something you add “later.” By the time you think you need it, you probably already do.


### Third Upgrade: Observability

As usage grew, observability became increasingly useful. I added **Prometheus** metrics to the Python service and built dashboards in **Grafana** to track what was actually happening.

Now I can see scan rates, resource consumption, latency, error conditions, detected viruses, and how the service behaves over time. When something slows down, there’s data to point at instead of guesswork. That alone has paid for the effort many times over.

---

## Future Improvments and Limitations

* **Improved queue system.**
    Files scans sporadically take longer than they should. Normalize scantimes Improve the queue system

* **Reducing scan times of large files.**
    Signature based scan times are strongly dependent on the size of the file
    Upload time adds to the round trip as well.
    Add support file chunking. However, this brings its own limitations as if a virus signature is split between two chunks and will be missed by the signature database

* **Webhook support.**
    Currently leaves the connection open until the file scan results are returned by the daemon.

* **Signature based.**
    This is an inherent limitation of ClamAV


---

## Where It Is Now

Today, AVoD runs as a containerized Python service deployed to Azure via CI/CD, scanning roughly 50,000 files per day. It uses pooled connections to ClamAV, is load-tested, and is fully observable through metrics and dashboards.

Most importantly, it does exactly what it set out to do: enforce antivirus scanning as a required gate before files are allowed into the environment.




## Final Thoughts

AVoD didn’t become reliable because of one big architectural decision. It became reliable through a series of small, sometimes boring improvements driven by real operational pain.

Local disk over object storage. Fewer TCP connections. Better metrics. Real load tests.

It started as a Python wrapper and turned into a service I trust to sit in the critical path of user uploads. That evolution is what made the project interesting — and worth writing about.
