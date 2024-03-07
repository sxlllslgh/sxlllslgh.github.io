---
title: 关于
layout: about
date: 2022-09-25 16:18:11
---
<h2>Publications</h2>
<ul id="my-works"></ul>
<script type="text/javascript">
    fetch('https://orcid.org/oauth/token', {method: 'POST', mode: 'no-cors', headers: {'Accept': 'application/json', 'Content-Type': 'x-www-form-urlencoded'}, body: 'client_id=APP-IDJJBU9NWR0GRYNH\nclient_secret=2764167f-6953-4d73-a9e5-8de46f78f7d6\nscope=/read-public\ngrant_type=client_credentials'}).then(auth_res => auth_res.json()).then(auth_info => {
        fetch('https://api.orcid.org/v3.0/0000-0002-4025-6874/works', {mode: 'no-cors',headers: {'Accept': `application/vnd.orcid+xml\nAuthorization type and Access token: ${auth_info.token_type} ${auth_info.access_token}`}}).then(works_res => works_res.json()).then(works => console.log(works));
    });
</script>