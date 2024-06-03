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
            const contributors = work['work-summary'][0].contributors.contributor;
            const authorSet = new Set();
            if (contributors != null) {
                for (const contributor of contributors) {
                    if (contributor['credit-name'].value == `${json.person.name["given-names"].value} ${json.person.name["family-name"].value}`) {
                        authorSet.add(`<span style="font-weight: bold">${contributor['credit-name'].value}</span>`);
                    } else {
                       authorSet.add(contributor['credit-name'].value);
                    }
                }
            }
            let citationButton = '';
            if (work["work-summary"][0].citation != null) {
                citationButton = `<a onclick="navigator.clipboard.writeText('${work["work-summary"][0].citation["citation-value"].replace(/(\r\n|\n|\r)/gm, "")}')"><i class="fa-solid fa-quote-right"></i></a>`;
            }
            item.innerHTML = `
                <div style="display: flex; flex-direction: column; justify-content: flex-start; align-items: left">
                    <div style="display: flex; flex-direction: row; justify-content: space-between; align-items: center">
                        <h3>${i + 1}. <a class="publication-item-link" href="${work['work-summary'][0]['external-ids']['external-id'][0]['external-id-url'].value}" target="_blank">${work['work-summary'][0].title.title.value}</a></h3>
                        <span style="justify-self: flex-end">${work["work-summary"][0]["publication-date"].year.value}.${work["work-summary"][0]["publication-date"].month.value}</span>
                    </div>
                    <div style="display: flex; flex-direction: row; justify-content: space-between; align-items: center">
                        <div style="display: flex; flex-direction: column; justify-content: flex-start; align-items: left">
                            <div>${Array.from(authorSet).join(', ')}</div>
                            <div style="display: flex; flex-direction: row; justify-content: left; align-items: center">
                                <span style="font-style: italic; font-weight: bold">${work["work-summary"][0]["journal-title"].value}</span>
                            </div>
                        </div>
                        ${citationButton}
                    </div>
                </div>
            `;
            document.getElementById('my-works').appendChild(item);
        }
    });
</script>