(from https://github.com/rubensworks/article-journal-privacy-decentralized/wiki/Planning)

# 1. Server

**Effort: medium**

## 1.1. Overview

A Solid community server instance with a file-based storage.
We will keep it simple, and just make use of the default server, without creating any plugins.
We will create our data files and their summaries beforehand in an offline step,
and just load them into the server for experimenting.

In our experiments, we will have one instance of this server (hosts all pods).

For simplicity, we will not enable access control on files themselves, as this will have no impact on our results (constant factor when using summaries or not).
We will only attach keys to files when summarizing.

## 1.2. Tasks

1. [ ] JavaScript library that takes an RDF file (`file.ttl`) and array of access keys as input, and outputs a privacy-preserving summary (`file.ttl.summary`).
  * `rdf-parse` can parse any RDF file: https://www.npmjs.com/package/rdf-parse
  * `bloem`, `base64-arraybuffer`, and `murmurhash` may come in handy for creating Bloom filters. These files are good examples on how they are used for summary creation: https://github.com/LinkedDataFragments/Server.js/tree/feature-handlers-amf-2/lib/amf (Warning: these are *NOT* privacy-preserving yet)
  * The output (`file.ttl.summary`) will be a directory containing 4 files: (`subjects.bloom`, `predicates.bloom`, `objects.bloom`, `graphs.bloom`)

When we load files into the Solid server, summaries will always exist in the same directory as the main file, but have the `.summary` suffix.

## 1.3. Optional

If we have time left, a cleaner solution would be to create a plugin for the Solid server
that is able to create summaries on the fly (via different strategies).
This would allow us to only ingest our data files,
and the server would take care of summarization automatically.

Furthermore, another plugin can add HTTP link headers pointing files to their summaries,
so that clients can automatically discover them.

# 2. Aggregator

**Effort: low**

Just like the server(s), this will be a Solid community server instance with a file-based storage, and without custom plugins.
We will do aggregation creation as an offline preprocess.

In our experiments, one aggregator will exist.
It will hold one aggregated summary (`aggregated.summary`) and a list of sources it aggregates over (`sources.ttl`)

## 2.1. Tasks

1. [ ] JavaScript library that creates an aggregated summary based on regular summaries.
  * Input is a mapping of file URLs to summary URLs `{ 'http://.../file1.ttl': 'http://.../file1.ttl.summary', ... }`.
  * Outputs an aggregated summary (`aggregated.summary`)
  * Outputs an RDF file containing the list of sources it aggregated over `sources.ttl`: `<> ex:aggregates <http://.../file1.ttl>` (better predicate needed...)

# 3. Client

**Effort: low**

A Comunica instance that takes as input:
1. SPARQL query
2. List of sources (files to query over)
3. Link to aggregated summary
4. Personal access keys

## 3.1. Tasks

1. [ ] New actor `encrypted-bloom-filter` on the `query-operation-quad-pattern` bus.
  * Fetches aggregated summary, and caches it for future use (only for duration of query exec).
  * For a given quad pattern, loop over the keys, and check if a match can be found in the summary. If none can be found, empty result are returned. Otherwise, action is forwarded to next actor.
  * Implementation will be similar to https://github.com/comunica/comunica-feature-amf/blob/master/packages/actor-query-operation-quadpattern-membership-filter/lib/ActorQueryOperationQuadpatternMembershipFilter.ts

# 4. Experiments

**Effort: high**

Our main experiment will simulate decentralized profile pages and friend relationships.
We will do queries with and without the aggregated summary,
to measure its effect on different metric.s

## 4.1. Data

LDBC's Social Network Benchmark dataset will be used.
Since this dataset is a single file, we will split it into different Linked Data documents (by triple subject)
using rdf-dataset-fragmenter.js.
(Ruben has already done this, so we have this dataset at hand)

* https://github.com/ldbc/ldbc_snb_datagen
* https://github.com/rubensworks/rdf-dataset-fragmenter.js

We will need to create a (configurable with seed) pseudorandom assignment of keys to people.
For simplicity, we assume all or nothing access to information (so either full file, or nothing at all).

### 4.1.1. Tasks

(Make sure this can be done via a script, which we can call later via Docker)

1. [ ] Generate keys of people. Key ownership index: `{ 'http://.../person123': [ 'key1', 'key2', ... ], ... }`; Key file assignment index: `{ 'http://.../file1.ttl': [ 'key1', 'key2', ... ], ... }`.
	* Obtain all people and their friend links.
	* For each friend relationship, person A has a chance X of having access to friend's B information => create new key K and add to key ownership index for person A and key file assignment index for profile file of person B.
2. [ ] Feed all files and keys into the summary creation library. (using key file assignment index)
3. [ ] Create the aggregated summary based on all summarized files.

## 4.2. Queries

We will create several that focus on retrieving basic information from people's friends in the LDBC dataset. (just like our dataset)

### 4.2.1. Tasks

(Make sure this can be done via a script, which we can call later via Docker)

1. [ ] Create SPARQL query templates for a (template) variable person, and different information shapes for friends (or friends of friends, ...).
2. [ ] Instantiate the query templates for a configurable number of persons that exist in the dataset.
3. [ ] For each instantiated query, simulate execution by different people by selecting pseudorandom people from the key ownership index
    * Each instantiated query will be executed multiple times, each time by a different person
	* Each different person will have a different set of keys, based on the key ownership index

## 4.3. Setup

1. Single Solid server hosting all data pods
2. Single Solid server hosting the aggregated summary
3. Single Comunica instance for executing query set

### 4.3.1. Tasks

Everything will be Docker-based.
The idea is that we just create (one or more) configs of our experimental setup,
and Docker containers are setup based on this that generate data+queries, setup the different components, run the experiments, and return the raw results.
This will make our experiments fully reproducible.

1. [ ] Configure all components in a docker-compose config (will all have single static config throughout whole experiment)
	* Example: https://github.com/comunica/comunica-bencher
	* This requires loading all data into the server, including aggregated summary
	* Summaries for files are not strictly needed, as we will only use aggregated summary in experiments
2. [ ] When docker-compose config starts, iterate over the query set
    * Execute query (with keys and link to aggregated summary) in Comunica
	* Measure exec time, HTTP requests, number of results (this can be done via stats writer)
	* Execute each query five times (for averaging)
	* Repeat this for different chances X for having access to friend's information: 10%, 20%, 30%, 40%, 50%, 60%, 70%, 80%, 90%, 100%
	* Repeat this with different dataset sizes: ???
3. [ ] Repeat the exact same query set, but this time WITHOUT a link to the aggregated summary => no source selection will be done

## 4.4. Result analysis

Create the following figures:

* [ ] For each query (X-axis), grouped by with and without summary, show execution times (Y-axis) (for a fixed chance X)
	=> We expect with summary to be faster in most cases
* [ ] Optional: For each query (X-axis), grouped by with and without summary, show number of HTTP requests (Y-axis) (for a fixed chance X)
	=> We expect same as exec times
* [ ] Optional: For a few queries, compare result (X-axis) arrival times (Y-axis) with and without summary (for a fixed chance X)
	=> We expect that summary will slow down time to first result, but total result time will be lower
* [ ] For all chances X (X-axis), show average execution time (Y-axis) across all queries. Also show a line when no summary is used.
	=> We expect that for increasing chance, the exec times will converge to when no summary is used.
* [ ] Optional: Show avg exec times for different dataset sizes