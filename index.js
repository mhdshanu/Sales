import express from 'express';
import bodyParser from 'body-parser';
import pg from 'pg';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = 3000;

const db = new pg.Client({
    user: "postgres",
    host: "localhost",
    database: "sales",
    password: "mhdshanu@123",
    port: 5432,
});
db.connect();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.static(path.join(__dirname, 'public')));

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

function getTaxNumber(customer) {
    let tax_number;
    if (customer === "one") {
        tax_number = 123;
    }   
    else if (customer === "two") {
        tax_number = 456;
    }   
    else if (customer === "three") {
        tax_number = 789;
    }     
    return tax_number;
}

function priceCaluculator(item){
    let price;  
    let tax;
    if(item === "A"){
        price = 10;
        tax = 10;
    }
    else if(item === "B"){
        price = 12;
        tax = 10;
    }
    else if(item === "C"){
        price = 14;
        tax = 10;
    }
    else if(item === "D"){
        price = 16;
        tax = 15;
    }
    else if(item === "E"){
        price = 20;
        tax = 10;
    }
    return {price, tax}
}

function itemFinder(item){
    let itemName;
    if(item ==="A"){
        itemName = "A";
    }
    else if(item === "B"){
        itemName = "B";
    }
    else if(item === "C"){
        itemName = "C";
    }
    else if(item === "D"){
        itemName = "D";
    }
    else if(item === "E"){
        itemName = "E";
    }
    return itemName;
}

function customerFinder(customer){
    let customerName;
    if(customer === "one"){
        customerName = "one";
    }
    else if(customer === "two"){
        customerName = "two";
    }
    else if(customer === "three"){
        customerName = "three";
    }
    return customerName;
}

app.get("/", (req, res) => {
    res.render("index");
});

app.get("/documentation",(req, res)=>{
    res.render("documentation.ejs");
})

app.post("/submit", async (req, res) => {
    const customer = req.body.customer; 
    const item = req.body.item;
    const tax_number = getTaxNumber(customer);  // Pass customer to getTaxNumber
    const priceCalc = priceCaluculator(item);
    const price = priceCalc.price;
    const tax = priceCalc.tax;
    const itemName = itemFinder(item);  
    const customerName = customerFinder(customer);
    
    console.log(`Customer: ${customer}, Item: ${item}`);
    
    try {
        // Insert into customers and items
        await db.query("INSERT INTO customers (name, tax_number) VALUES ($1, $2) ", [customer, tax_number]);
        await db.query("INSERT INTO items(item, price, tax) VALUES($1, $2, $3) ", [item, price, tax]);
        
        // Retrieve customer_id
        const customerResult = await db.query("SELECT id FROM customers WHERE name = $1", [customerName]);
        if (customerResult.rows.length === 0) {
            throw new Error(`Customer not found: ${customerName}`);
        }
        const customerId = customerResult.rows[0].id;
        
        // Retrieve item_id
        const itemResult = await db.query("SELECT id FROM items WHERE item = $1", [itemName]);
        if (itemResult.rows.length === 0) {
            throw new Error(`Item not found: ${itemName}`);
        }
        const itemId = itemResult.rows[0].id;
        
        // Get special price from the function
        const specialPriceResult = await db.query("SELECT get_item_price($1, $2) AS special_price", [customerId, itemId]);
        const specialPrice = specialPriceResult.rows[0].special_price;
        console.log(`Special Price: ${specialPrice}`);

        // Insert into customer_item
        await db.query("INSERT INTO customer_item (customer_id, item_id, special_price) VALUES ($1, $2, $3) ON CONFLICT (customer_id, item_id) DO UPDATE SET special_price = EXCLUDED.special_price", [customerId, itemId, specialPrice]);

        res.redirect(`/result?customer=${encodeURIComponent(customer)}&item=${encodeURIComponent(item)}&taxNumber=${encodeURIComponent(tax_number)}`);
    } catch (error) {
        console.error('Error executing query', error.stack);
        res.status(500).send('Internal Server Error');
    }
});




app.get('/result', async (req, res) => {
    const customer = req.query.customer; 
    const item = req.query.item;         
    const taxNumber = req.query.taxNumber; 
    const itemName = itemFinder(item);  
    const customerName = customerFinder(customer);

    try {
        const customerResult = await db.query("SELECT id FROM customers WHERE name = $1", [customerName]);
        if (customerResult.rows.length === 0) {
            throw new Error(`Customer not found: ${customerName}`);
        }
        const customerId = customerResult.rows[0].id;

        const itemResult = await db.query("SELECT id FROM items WHERE item = $1", [itemName]);
        if (itemResult.rows.length === 0) {
            throw new Error(`Item not found: ${itemName}`);
        }
        const itemId = itemResult.rows[0].id;

        const specialPriceResult = await db.query("SELECT get_item_price($1, $2) AS special_price", [customerId, itemId]);
        const specialPrice = specialPriceResult.rows[0].special_price;
        console.log(specialPrice);

        const totalPriceResult = await db.query("SELECT get_total_price_by_customer($1) AS total_price", [customerName]);
        const totalPrice = totalPriceResult.rows[0].total_price;
        console.log(`Total Price for ${customerName}: ${totalPrice}`);

        res.render('result', {
            customer: customer,
            item: item,
            taxNumber: taxNumber,
            specialPrice: specialPrice,
            totalPrice: totalPrice
        });
    } catch (error) {
        console.error('Error executing query', error.stack);
        res.status(500).send('Internal Server Error');
    }
});


app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
