---
title: 关于
layout: about
date: 2022-09-25 16:18:11
---
<ul id="my-works"></ul>
<script type="text/javascript">
    fetch('https://orcid.org/oauth/token', {method: 'POST', headers: {'Accept': 'application/json'}, body: 'client_id=APP-IDJJBU9NWR0GRYNH&client_secret=2764167f-6953-4d73-a9e5-8de46f78f7d6&scope=/read-public&grant_type=client_credentials'}).then(auth_res => auth_res.json()).then(auth_info => {
        fetch('https://api.orcid.org/v3.0/0000-0002-4025-6874/works', {headers: {'Accept': `application/vnd.orcid+xml\nAuthorization type and Access token: ${auth_info.token_type} ${auth_info.access_token}`}}).then(works_res => works_res.json()).then(works => console.log(works));
    });
</script>