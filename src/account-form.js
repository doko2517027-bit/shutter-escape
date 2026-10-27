// Keep the live form (including autofill and mobile keyboard focus) during async UI updates.
// Passwords stay only in the input element: never copy them into HTML, app state or storage.
export function renderPreservingAccountForm(root,html){const current=root.querySelector('#account-form');if(!current){root.innerHTML=html;return false}const template=root.ownerDocument.createElement('template');template.innerHTML=html;const incoming=template.content.querySelector('#account-form');if(!incoming||incoming.dataset.variant!==current.dataset.variant){root.innerHTML=html;return false}
 for(const notice of root.querySelectorAll('.notice'))notice.remove()
 for(const notice of template.content.querySelectorAll('.notice'))root.append(notice)
 const buttons=[...template.content.querySelectorAll('button')];root.querySelectorAll('button').forEach((button,i)=>{button.disabled=buttons[i]?.disabled||false})
 return true
}
