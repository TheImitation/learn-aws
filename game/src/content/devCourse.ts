import type { Topic } from '@content';

/** The Developer badge track — AWS Certified Developer – Associate (DVA-C02).
 *  Same format as the frozen SAA course (which stays read-only): every topic
 *  carries the real-world analogy pair and a 4-question TD-level quiz.
 *  Domains and weights follow the official exam guide:
 *  Development 32 · Security 26 · Deployment 24 · Troubleshooting 18. */

const t = (o: {
  id: string; title: string; examDomain: string; summary: string;
  quiz: Topic['quiz'];
}): Topic => ({ ...o, blocks: [], connections: [], stages: [] });

export const DEV_DOMAIN = {
  dev: 'Development with AWS Services',
  sec: 'Security (Developer)',
  dep: 'Deployment',
  ops: 'Troubleshooting and Optimization',
};

export const DEV_COURSE: { title: string; topics: Topic[] } = {
  title: 'On-Call: Developer Badge (DVA-C02)',
  topics: [

    /* ------------------------------------------ Development with AWS Services */
    t({
      id: 'dva-idempotent-lambda',
      title: 'Idempotent Handlers',
      examDomain: DEV_DOMAIN.dev,
      summary: 'At-least-once delivery means your Lambda WILL run twice. Idempotency keys make the second run harmless.',
      quiz: [
        { kind: 'single', prompt: 'An SQS-triggered Lambda occasionally charges customers twice. The most robust fix is:',
          options: ['Disable SQS retries entirely', 'Record an idempotency key per order and skip work when it already exists', 'Increase the visibility timeout to 12 hours', 'Move the charge into the API layer'],
          correct: [1], explain: 'Queues deliver at-least-once by design. Making the handler idempotent (conditional write on a unique key) makes duplicates harmless; disabling retries trades duplicates for lost orders.' },
        { kind: 'single', prompt: 'Which DynamoDB feature implements an idempotency check atomically?',
          options: ['Scan before write', 'A conditional PutItem with attribute_not_exists(pk)', 'A GSI on the order id', 'DynamoDB Streams'],
          correct: [1], explain: 'A conditional write succeeds exactly once per key — the check and the write are one atomic operation, with no race between reading and writing.' },
        { kind: 'multi', prompt: 'Which duplicate sources should an event-driven developer assume exist? (Pick 2)',
          options: ['At-least-once delivery from SQS/SNS/EventBridge', 'Client retries on timeout', 'TLS handshakes', 'IAM policy evaluation'],
          correct: [0, 1], explain: 'Both the messaging layer and impatient clients re-send. Neither TLS nor IAM re-runs your business logic.' },
        { kind: 'single', prompt: 'A handler is "idempotent" when:',
          options: ['It runs in under a second', 'Running it N times with the same input has the same effect as running it once', 'It never throws', 'It only reads data'],
          correct: [1], explain: 'Idempotency is about repeated effect, not speed or error handling.' },
      ],
    }),

    t({
      id: 'dva-ddb-hot-partition',
      title: 'DynamoDB Key Design',
      examDomain: DEV_DOMAIN.dev,
      summary: 'DynamoDB scales by partition key. A key everyone writes at once ("today") melts one partition while the rest idle.',
      quiz: [
        { kind: 'single', prompt: 'A table keyed on PK=order_date throttles every morning at 9. Why?',
          options: ['The table is out of storage', 'All writes share one partition key value, overloading a single partition', 'GSIs are missing', 'DynamoDB is single-threaded'],
          correct: [1], explain: 'Capacity is spread across partitions by key. One "hot" key concentrates the whole write load on one partition regardless of provisioned totals.' },
        { kind: 'single', prompt: 'The best fix for the hot date key is:',
          options: ['Provision 10× more WCU', 'A high-cardinality composite key such as userId#date', 'Switch to Scan-based reads', 'Shorten the item TTL'],
          correct: [1], explain: 'High-cardinality keys spread writes across partitions. Over-provisioning one hot partition still caps at the per-partition limit.' },
        { kind: 'single', prompt: 'Query vs Scan: why does Query cost less?',
          options: ['Query is cached automatically', 'Query reads only items sharing a partition key; Scan reads the whole table', 'Scan uses strongly consistent reads', 'They cost the same'],
          correct: [1], explain: 'Scan touches every item and bills for everything it reads; Query jumps straight to one key\'s items.' },
        { kind: 'multi', prompt: 'Which access patterns suit a Global Secondary Index? (Pick 2)',
          options: ['Querying by an attribute that is not the table key', 'Serving an alternate sort order', 'Making writes cheaper', 'Enforcing uniqueness across two attributes'],
          correct: [0, 1], explain: 'GSIs give you new query shapes (different key/sort). They add write cost rather than reduce it, and they don\'t enforce uniqueness.' },
      ],
    }),

    t({
      id: 'dva-api-proxy',
      title: 'API Gateway Proxy Contract',
      examDomain: DEV_DOMAIN.dev,
      summary: 'With Lambda proxy integration, YOUR code is the HTTP layer: statusCode, headers, and a string body — or the client gets a 502.',
      quiz: [
        { kind: 'single', prompt: 'API Gateway (proxy integration) returns 502 "Internal server error" though the Lambda ran fine. Most likely:',
          options: ['The Lambda timed out', 'The function returned an object that is not {statusCode, headers, body}', 'The stage is not deployed', 'IAM denied the invoke'],
          correct: [1], explain: 'In proxy mode API Gateway forwards your return value verbatim as the HTTP response — a malformed shape is a 502, even when the code "worked".' },
        { kind: 'single', prompt: 'The browser blocks your API responses with a CORS error. The fix in proxy integration is:',
          options: ['Return Access-Control-Allow-Origin headers from the function (and answer OPTIONS)', 'Turn off HTTPS', 'Add the domain to Route 53', 'Increase Lambda memory'],
          correct: [0], explain: 'Proxy mode passes your headers through — CORS headers are the function\'s job (plus an OPTIONS preflight route).' },
        { kind: 'single', prompt: 'The `body` field of a proxy response must be:',
          options: ['A JSON object', 'A string (JSON.stringify it yourself)', 'A Buffer', 'Omitted for GET'],
          correct: [1], explain: 'API Gateway expects body as a string; objects must be serialized by your code.' },
        { kind: 'multi', prompt: 'Which belong in the proxy response contract? (Pick 2)',
          options: ['statusCode', 'headers', 'vpcConfig', 'reservedConcurrency'],
          correct: [0, 1], explain: 'statusCode/headers/body form the contract; the others are function configuration, not response fields.' },
      ],
    }),

    t({
      id: 'dva-stepfn-retry',
      title: 'Step Functions Error Handling',
      examDomain: DEV_DOMAIN.dev,
      summary: 'Distributed sagas fail mid-flight. Retry with backoff for the transient, Catch to a cleanup path for the permanent.',
      quiz: [
        { kind: 'single', prompt: 'A payment workflow wedges forever when the email step hits a rate limit. The state machine is missing:',
          options: ['More Lambda memory', 'A Retry policy with exponential backoff on the state', 'A bigger timeout on the whole execution', 'X-Ray tracing'],
          correct: [1], explain: 'Transient throttles want per-state Retry (interval, backoff rate, max attempts). Without it the state fails the execution outright.' },
        { kind: 'single', prompt: 'When retries are exhausted, a robust saga should:',
          options: ['Silently succeed', 'Catch the error into a compensation/cleanup branch (refund, alert)', 'Restart the whole execution from step one', 'Delete the execution history'],
          correct: [1], explain: 'Catch routes permanent failures to compensation logic — the saga pattern — instead of leaving half-finished business state.' },
        { kind: 'single', prompt: 'Wrapping every Lambda in its own try/catch that returns success "so the flow never breaks" causes:',
          options: ['Faster executions', 'Silent data corruption — the machine believes failed steps succeeded', 'Lower cost', 'Automatic rollbacks'],
          correct: [1], explain: 'Swallowing errors hides failure from the orchestrator. The machine marches on over broken state — worse than failing loudly.' },
        { kind: 'multi', prompt: 'Which Retry fields does Step Functions support? (Pick 2)',
          options: ['BackoffRate', 'MaxAttempts', 'CooldownPeriod', 'RetryQueueArn'],
          correct: [0, 1], explain: 'Retry takes ErrorEquals, IntervalSeconds, BackoffRate, MaxAttempts. The other two are invented.' },
      ],
    }),

    /* --------------------------------------------------------------- Security */
    t({
      id: 'dva-jwt-cognito',
      title: 'Verifying JWTs Properly',
      examDomain: DEV_DOMAIN.sec,
      summary: 'A JWT is only proof if the SERVER verifies signature, issuer, audience, and expiry. Client-side checks are theater.',
      quiz: [
        { kind: 'single', prompt: 'Your API trusts any request whose JWT payload contains "admin: true". The core flaw is:',
          options: ['JWTs cannot carry roles', 'Nothing verifies the token signature/issuer — anyone can mint that payload', 'The token should be in a cookie', 'Tokens must be encrypted, not signed'],
          correct: [1], explain: 'Unverified claims are attacker input. Verification against the issuer\'s public keys (JWKS) is what makes claims trustworthy.' },
        { kind: 'single', prompt: 'The API Gateway feature that validates Cognito user-pool tokens before your code runs is:',
          options: ['A usage plan', 'A Cognito (JWT) authorizer', 'A resource policy', 'A WAF rule'],
          correct: [1], explain: 'The authorizer checks signature, iss, aud/client_id, and exp at the front door — unauthenticated requests never reach the Lambda.' },
        { kind: 'multi', prompt: 'Which claims must a verifier check? (Pick 3)',
          options: ['exp (expiry)', 'iss (issuer)', 'aud/client (audience)', 'favorite_color'],
          correct: [0, 1, 2], explain: 'Expiry, issuer, and audience — plus the signature itself — are the minimum. Extra claims are application data.' },
        { kind: 'single', prompt: 'API keys (usage plans) are a substitute for user authentication:',
          options: ['True — a key identifies the user', 'False — keys meter/throttle clients; they are not identity or authorization', 'True, if the key is long', 'Only for internal APIs'],
          correct: [1], explain: 'Usage-plan keys identify an application for throttling/quotas. They are shared, long-lived, and prove nothing about a user.' },
      ],
    }),

    t({
      id: 'dva-secrets-in-code',
      title: 'Secrets Out of the Repo',
      examDomain: DEV_DOMAIN.sec,
      summary: 'Credentials in code outlive the commit that leaked them. Fetch at runtime from Secrets Manager and rotate without redeploys.',
      quiz: [
        { kind: 'single', prompt: 'A database password was committed to git last year. Beyond rotating it, the durable fix is:',
          options: ['A .gitignore entry', 'Fetch the secret at runtime from Secrets Manager via the SDK', 'Rename the repository private', 'Base64-encode the password in code'],
          correct: [1], explain: 'History keeps leaked strings forever; .gitignore and encoding don\'t help. Runtime fetch + IAM keeps secrets out of artifacts entirely.' },
        { kind: 'single', prompt: 'Plain environment variables for the DB password "work". What do they still fail?',
          options: ['Performance', 'Rotation without redeploys, and exposure in console/config dumps', 'IAM authentication', 'Multi-region'],
          correct: [1], explain: 'Env vars are readable to anyone who can view the function config and are frozen at deploy time — rotation means redeploying everything.' },
        { kind: 'single', prompt: 'Secrets Manager\'s headline advantage over plain Parameter Store values is:',
          options: ['It is free', 'Built-in automatic rotation via Lambda', 'It works offline', 'It stores larger values'],
          correct: [1], explain: 'Managed rotation (with RDS integrations out of the box) is the differentiator; both can store encrypted strings.' },
        { kind: 'multi', prompt: 'Good handling of a secret in application code includes: (Pick 2)',
          options: ['Cache it in memory with a TTL instead of fetching every request', 'Grant the function IAM permission for only that secret', 'Log it once at startup for debugging', 'Email it to the team'],
          correct: [0, 1], explain: 'Cache briefly (rotation-aware) and scope IAM to the specific ARN. Never log or share secrets.' },
      ],
    }),

    t({
      id: 'dva-sts-least-priv',
      title: 'Short-Lived Credentials',
      examDomain: DEV_DOMAIN.sec,
      summary: 'CI/CD and apps should ASSUME roles for minutes, not carry admin keys forever. Leaked temp creds die on their own.',
      quiz: [
        { kind: 'single', prompt: 'The CI pipeline authenticates with a long-lived admin access key stored in repo settings. The modern replacement is:',
          options: ['A longer key rotated yearly', 'OIDC federation: the pipeline assumes a scoped IAM role via STS at run time', 'The root user with MFA', 'One shared developer key'],
          correct: [1], explain: 'OIDC lets the CI provider exchange a signed identity token for short-lived role credentials — nothing static to leak, and the role is scoped to exactly the deploy actions.' },
        { kind: 'single', prompt: 'sts:AssumeRole returns:',
          options: ['A permanent access key', 'Temporary credentials (key, secret, session token) that expire', 'A console password', 'A KMS key'],
          correct: [1], explain: 'Temporary credentials expire (15 min–12 h). Expiry is the safety property: a leak has a countdown.' },
        { kind: 'single', prompt: 'A "deploy" role for CI should be scoped to:',
          options: ['AdministratorAccess for flexibility', 'Exactly the services/actions/resources the pipeline touches', 'ReadOnlyAccess', 'Whatever the last engineer used'],
          correct: [1], explain: 'Least privilege: enough to deploy the stack, nothing else. Read-only can\'t deploy; admin turns any pipeline bug into a full-account incident.' },
        { kind: 'multi', prompt: 'Why are long-lived access keys in a repo dangerous? (Pick 2)',
          options: ['Git history preserves them after deletion', 'They keep working until someone notices and rotates them', 'They slow down builds', 'They expire too quickly'],
          correct: [0, 1], explain: 'History leaks + no expiry = an unbounded incident window. Speed is unaffected — that\'s part of why they linger.' },
      ],
    }),

    /* ------------------------------------------------------------- Deployment */
    t({
      id: 'dva-sam-drift',
      title: 'Infrastructure as Code',
      examDomain: DEV_DOMAIN.dep,
      summary: 'Console-clicked infrastructure exists only in one region and one person\'s memory. Templates make environments reproducible.',
      quiz: [
        { kind: 'single', prompt: 'Staging works, prod fails, and nobody can say how they differ. The root cause pattern is:',
          options: ['AWS regional outage', 'Hand-built environments drifting apart — no single source of truth', 'Too many templates', 'CloudWatch misconfiguration'],
          correct: [1], explain: 'Click-built environments diverge silently. IaC (SAM/CloudFormation) makes the definition reviewable, diffable, and re-deployable.' },
        { kind: 'single', prompt: 'AWS SAM is best described as:',
          options: ['A monitoring agent', 'CloudFormation shorthand for serverless resources (functions, APIs, tables)', 'A container runtime', 'A billing tool'],
          correct: [1], explain: 'SAM templates transform into CloudFormation — less YAML for the common serverless shapes, same engine underneath.' },
        { kind: 'single', prompt: 'CloudFormation drift detection tells you:',
          options: ['Cost anomalies', 'Where live resources no longer match the template', 'Which Lambdas are slow', 'Unused IAM roles'],
          correct: [1], explain: 'Drift = manual console edits since the last deploy. Finding it is how you claw environments back under version control.' },
        { kind: 'multi', prompt: 'Benefits of deploying from templates rather than the console: (Pick 2)',
          options: ['Code review for infrastructure changes', 'Identical rebuilds in a new account/region', 'Lower AWS prices', 'No IAM needed'],
          correct: [0, 1], explain: 'Review and reproducibility are the wins. Pricing and IAM are unchanged.' },
      ],
    }),

    t({
      id: 'dva-canary-alias',
      title: 'Canary Releases',
      examDomain: DEV_DOMAIN.dep,
      summary: 'Ship to 10% behind an alias, watch the alarms, then promote. All-at-once Friday deploys are how legends (and outages) are made.',
      quiz: [
        { kind: 'single', prompt: 'Lambda aliases enable canary deploys by:',
          options: ['Duplicating the function code', 'Weighted routing between two published versions', 'Increasing memory during deploys', 'Freezing concurrency'],
          correct: [1], explain: 'An alias can split traffic (e.g., 90/10) between versions — the mechanism CodeDeploy uses for Canary10Percent strategies.' },
        { kind: 'single', prompt: 'What should gate a canary\'s promotion to 100%?',
          options: ['A 10-minute timer alone', 'CloudWatch alarms on errors/latency wired to automatic rollback', 'A manager\'s email', 'Traffic volume'],
          correct: [1], explain: 'Time passing proves nothing. Alarms on the canary\'s error rate give the deploy an objective pass/fail with instant rollback.' },
        { kind: 'single', prompt: 'A published Lambda VERSION is:',
          options: ['Mutable like $LATEST', 'An immutable snapshot of code + configuration', 'A separate AWS account', 'A CloudFormation stack'],
          correct: [1], explain: 'Versions are frozen; aliases are movable pointers to them. That immutability is what makes instant rollback trustworthy.' },
        { kind: 'multi', prompt: 'Compared with all-at-once, canary deploys: (Pick 2)',
          options: ['Limit the blast radius of a bad release', 'Give a rollback path measured in seconds', 'Remove the need for tests', 'Eliminate cold starts'],
          correct: [0, 1], explain: '10% exposure + pointer-flip rollback. Tests are still your first line; cold starts are unrelated.' },
      ],
    }),

    t({
      id: 'dva-pipeline-gates',
      title: 'Pipelines with Gates',
      examDomain: DEV_DOMAIN.dep,
      summary: 'The pipeline is the paved road: build, test, stage, approve, deploy. Hotfixes that skip it become incidents that keep you up.',
      quiz: [
        { kind: 'single', prompt: 'In CodePipeline, automated tests belong:',
          options: ['After production deploy', 'In a build/test stage that blocks promotion on failure', 'In a weekly cron', 'Nowhere — reviews suffice'],
          correct: [1], explain: 'A failing test stage stops the artifact from ever reaching prod — that is the entire point of the pipeline.' },
        { kind: 'single', prompt: 'A manual approval action is most valuable:',
          options: ['Before every unit test', 'Between staging and production for release sign-off', 'After rollback', 'It has no use'],
          correct: [1], explain: 'Machines gate on tests; humans gate on business readiness. The approval sits at the staging→prod boundary.' },
        { kind: 'single', prompt: '"Just this once, push the hotfix straight to prod" mainly risks:',
          options: ['Higher latency', 'Shipping an untested artifact with no record or rollback path', 'AWS quota limits', 'Slower builds later'],
          correct: [1], explain: 'Skipping the pipeline skips tests, artifact provenance, and the automated rollback — the exact protections you need most during an incident.' },
        { kind: 'multi', prompt: 'CodeBuild\'s role in a pipeline includes: (Pick 2)',
          options: ['Compiling/packaging the artifact', 'Running the test suite', 'Serving production traffic', 'Managing DNS'],
          correct: [0, 1], explain: 'CodeBuild is the build-and-test engine; serving traffic and DNS are other services\' jobs.' },
      ],
    }),

    /* --------------------------------------------- Troubleshooting & Optimization */
    t({
      id: 'dva-xray-tracing',
      title: 'Tracing with X-Ray',
      examDomain: DEV_DOMAIN.ops,
      summary: 'When a request crosses four services, averages lie. A trace shows the one hop where the p99 dies.',
      quiz: [
        { kind: 'single', prompt: 'API p99 is 6s but every service\'s AVERAGE looks fine. The tool that finds the guilty hop is:',
          options: ['CloudTrail', 'X-Ray distributed tracing (segments per hop, per request)', 'Cost Explorer', 'VPC Flow Logs'],
          correct: [1], explain: 'Traces follow ONE request across services with timing per segment — tail latency hides in exactly the place averages can\'t show.' },
        { kind: 'single', prompt: 'In X-Ray, a "segment" represents:',
          options: ['A VPC subnet', 'The work one service did for one traced request', 'A CloudWatch alarm', 'An IAM boundary'],
          correct: [1], explain: 'Each service adds a segment (with optional subsegments for calls it makes); together they form the request\'s timeline.' },
        { kind: 'single', prompt: 'The trace shows 5.8s inside a DynamoDB call that returns 3 items. Likely culprit:',
          options: ['Network jitter', 'A Scan over the whole table instead of a keyed Query', 'KMS throttling', 'Lambda cold start'],
          correct: [1], explain: 'Scans read everything and filter later — tiny results, huge read time. The fix is a Query against a proper key or index.' },
        { kind: 'multi', prompt: 'The three pillars of observability are: (Pick 3)',
          options: ['Logs', 'Metrics', 'Traces', 'Tickets'],
          correct: [0, 1, 2], explain: 'Logs (what happened), metrics (how much/how fast), traces (where, across services). Tickets are what you file after ignoring them.' },
      ],
    }),

    t({
      id: 'dva-lambda-tuning',
      title: 'Lambda Right-Sizing',
      examDomain: DEV_DOMAIN.ops,
      summary: 'Memory IS the CPU dial. 128MB "to save money" can time out, retry, and cost more than a right-sized function.',
      quiz: [
        { kind: 'single', prompt: 'Raising a Lambda from 128MB to 1024MB made it cheaper per invocation. How?',
          options: ['AWS rounds bills down', 'CPU scales with memory — it finished ~8× faster, and GB-seconds fell', 'Memory is free below 1GB', 'It skipped cold starts'],
          correct: [1], explain: 'Billing is GB-seconds. More memory = proportionally more CPU; if runtime drops faster than the memory multiplier rises, the bill shrinks.' },
        { kind: 'single', prompt: 'An undersized function that times out on an SQS trigger causes:',
          options: ['Nothing — timeouts are free', 'Retries that repeat the whole slow run, multiplying cost and duplicates', 'Automatic memory increases', 'Queue deletion'],
          correct: [1], explain: 'Timeouts feed the retry machinery: the same slow work runs again (and again), amplifying both the bill and side effects.' },
        { kind: 'single', prompt: 'Cold-start latency on a rarely-called, latency-sensitive endpoint is best addressed by:',
          options: ['A bigger timeout', 'Provisioned concurrency on the alias', 'More retries', 'Switching region'],
          correct: [1], explain: 'Provisioned concurrency keeps initialized execution environments warm — the init cost is paid ahead of the request instead of during it.' },
        { kind: 'multi', prompt: 'Which inputs drive Lambda cost? (Pick 2)',
          options: ['Memory size (GB)', 'Execution duration (seconds)', 'Lines of code', 'Number of environment variables'],
          correct: [0, 1], explain: 'GB × seconds (plus request count). Code length and env vars are free.' },
      ],
    }),
  ],
};
