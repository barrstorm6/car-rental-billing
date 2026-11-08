import {prisma} from "@/lib/prisma";
import type {CarClass, Prisma} from '@/generated/prisma/client';
import type {PricingResult} from '@/types/invoice';

export class Repository{
     async getCar(id : string){
        const car = await prisma.car.findMany({
                where : { id }
            },
        )
         return car;
    }

    async getRental(id : string){
        const rental = await prisma.rental.findMany({
                where : { id }
            },
        )
        return rental;
    }

    async getRentalReturn(id : string){
        const rentalReturn = await prisma.rentalReturn.findMany({
                where : { id }
            },
        )
        return rentalReturn;
    }

    async getPricingRule(carClass: CarClass){
        const pricingRule = await prisma.pricingRule.findMany({
                where : { carClass }
            },
        )
        return pricingRule;
    }


    async getRentalInvoice(rentalId: string){
        const rentalInvoice  = await prisma.rentalInvoice.findMany({
                where : { rentalId }
            },
        )
        return rentalInvoice;
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

