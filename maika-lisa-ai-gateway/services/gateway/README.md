# LiteLLM Gateway

LiteLLM is the only AI gateway used by Maika and Lisa.

Internal endpoint:

```text
http://litellm:4000
```

Host endpoint:

```text
http://localhost:4000
```

OpenRouter is configured only as a backup model behind LiteLLM. Maika and Lisa must not call OpenRouter or direct providers by themselves.

