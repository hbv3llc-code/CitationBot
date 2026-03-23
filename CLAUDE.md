# CitationBot — Project Rules

## Git Remote / Repository

**GitHub repo:** `hbv3llc-code/concretecontractoraustin`

The local proxy routes pushes to this GitHub repo. The working proxy remote URL is:
```
http://local_proxy@127.0.0.1:39991/git/hbv3llc-code/CitationBot
```

Before any push, verify the remote resolves correctly:
```
git remote -v
# Should show: http://local_proxy@127.0.0.1:39991/git/hbv3llc-code/CitationBot
```

## Branch

Develop on the designated feature branch (provided per session). Never push to `main` without explicit permission.
