import {prisma} from "@/lib/prisma";

export class Repository{
     async getCar(id : string){
        const car = await prisma.car.findMany({
                where : { id }
            },
        )
    }

    async getRental(id : string){
        const rentals = await prisma.rental.findMany({
                where : { id }
            },
        )
    }

    async getRentalReturn(id : string){
        const rentals = await prisma.rentalReturn.findMany({
                where : { id }
            },
        )
    }

    async getPricingRule(id : string){
        const rentals = await prisma.pricingRule.findMany({
                where : { id }
            },
        )
    }


    async getRentalInvoice(id : string){
        const rentals = await prisma.rentalInvoice.findMany({
                where : { id }
            },
        )
    }
}

