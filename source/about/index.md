---
title: 关于
layout: about
date: 2022-09-25 16:18:11
---

<h2>Publications</h2>
<ul id="my-works" style="list-style-type: none"></ul>
<script type="text/javascript">
    fetch('/assets/record.json').then(response => response.json()).then(json => {
        for (const [i, work] of json['activities-summary'].works.group.entries()) {
            const item = document.createElement('li');
            const title = document.createElement('h4');
            title.innerHTML = `${i + 1}. ${work['work-summary'][0].title.title.value}`;
            item.appendChild(title);
            const journal = document.createElement('span');
            journal.innerHTML = work["work-summary"][0]["journal-title"].value;
            journal.style.fontStyle = 'italic';
            journal.style.fontWeight = 'bold';
            item.appendChild(journal);
            document.getElementById('my-works').appendChild(item);
        }
    });
</script>