export default async function decorate(block) {
    console.log(block);
    // block.textContent = '';
    const link = block.querySelector('a');
    if (link !== null){
        const include = document.createElement('div');
        fetch(link).then(response => {
            return response.text();
        }).then(data => {
            // include.innerHTML = data
            block.innerHTML = data;
        })
    }
}