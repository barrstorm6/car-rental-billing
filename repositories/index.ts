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

    async createRentalInvoice(rentalId: string, result: PricingResult){
        const rentalInvoice = await prisma.rentalInvoice.create({
            data: {
                rentalId: rentalId,
                breakdown: {...result.breakdown},
                totalAmount: result.totalAmount,
                currency: 'KZT'
            }
        });

        return rentalInvoice;
    }

    async closeRental(id: string){
        const rental = await prisma.rental.update({
            where: {id},
            data: {
                status: 'CLOSED'
            }
        });

        return rental;
    }
}

