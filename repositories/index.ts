import {prisma} from "@/lib/prisma";
import type {CarClass, Prisma} from '@/generated/prisma/client';
import type {PricingResult} from '@/types/invoice';

export class Repository{
     async getCar(id : string){
        const car = await prisma.car.findUnique({
                where : { id }
            },
        )
         return car;
    }

    async getRental(id : string){
        const rental = await prisma.rental.findUnique({
                where : { id }
            },
        )
        return rental;
    }

    async getRentalReturn(rentalId: string){
        const rentalReturn = await prisma.rentalReturn.findUnique({
                where : { rentalId }
            },
        )
        return rentalReturn;
    }

    async getPricingRule(carClass: CarClass){
        const pricingRule = await prisma.pricingRule.findUnique({
                where : { carClass }
            },
        )
        return pricingRule;
    }


    async getRentalInvoice(rentalId: string){
        const rentalInvoice  = await prisma.rentalInvoice.findUnique({
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

