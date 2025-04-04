function newFolder(name){

    const dirName = name;

    fs.mkdir(dirName, { recursive: true }, (err)=> {
        if (err) {
            console.error('Error creating directory:', err);
            return;
        }
        else{
        console.log(`Directory '${dirName}' created successfully.`);
        }
    });
}
module.exports = newFolder;