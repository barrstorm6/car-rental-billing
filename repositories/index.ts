import {prisma} from "@/lib/prisma";
import {RentalInvoiceModel} from "@/generated/prisma/models/RentalInvoice";
import {Car, Prisma, RentalStatus} from "@/generated/prisma/client";
import {InvoiceBreakdown} from "@/types/invoice";

export async function getRentals(rentalId:string){
return prisma.rental.findUnique({
    where:{
      id:rentalId,
    },
    include:{
        invoice:true
    }
})
}

export async function getCar(carId:string){
    return prisma.car.findUnique({
       where:{
           id:carId
       }
    })
}

export async function getPricingRule(car: Car) {
    return prisma.pricingRule.findUnique({
        where: {
            carClass: car.carClass,
        },
    });
}


export async function getRentalReturns(returnsId:string){
    return prisma.rentalReturn.findUnique({
        where:{
            rentalId:returnsId,
        }
    })
}

export async function getRentalInvoice(rentalId:string):Promise<RentalInvoiceModel | null>{
    return prisma.rentalInvoice.findUnique({
        where:{
            id:rentalId,
        }
    })
}

export async function updateRentalStatus(rentalId:string, status:RentalStatus){
    return prisma.rental.update({
        where:{
            id:rentalId
        },
        data:{
            status
        }
    })

}

export async function createRentalInvoices(rentalId:string, breakdown:InvoiceBreakdown, totalAmount: number,currency:string){
    const jsonBreakdown: Prisma.InputJsonObject = { ...breakdown };

    return prisma.rentalInvoice.create({
        data:{
            rentalId:rentalId,
            breakdown: jsonBreakdown,
            totalAmount,
            currency
        }
    })
}


